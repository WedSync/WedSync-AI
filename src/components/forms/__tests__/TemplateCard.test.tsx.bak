import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { TemplateCard } from '../TemplateCard'
import { EmailTemplate } from '@/types/email-template-library'

// Mock template data
const mockTemplate: EmailTemplate = {
  id: '1',
  name: 'Welcome Email Template',
  subject: 'Welcome to WedSync, {{client_name}}!',
  content: '<h2>Welcome!</h2><p>Thank you for choosing us for your special day.</p>',
  category: 'welcome',
  status: 'active',
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
  usage_count: 15,
  is_favorite: false,
  variables: ['client_name', 'wedding_date'],
  metadata: {
    author_name: 'John Doe',
    description: 'Welcome email for new clients',
    tags: ['onboarding', 'welcome'],
  },
}
const mockFavoriteTemplate: EmailTemplate = {
  ...mockTemplate,
  id: '2',
  name: 'Favorite Template',
  is_favorite: true,
describe('TemplateCard', () => {
  const mockOnSelect = jest.fn()
  const mockOnToggleSelect = jest.fn()
  const mockOnAction = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Grid View Rendering', () => {
    it('renders template information correctly in grid view', () => {
      render(
        <TemplateCard
          template={mockTemplate}
          viewMode="grid"
          selected={false}
          onSelect={mockOnSelect}
          onToggleSelect={mockOnToggleSelect}
          onAction={mockOnAction}
        />
      )
      expect(screen.getByText('Welcome Email Template')).toBeInTheDocument()
      expect(screen.getByText('Welcome to WedSync, {{client_name}}!')).toBeInTheDocument()
      expect(screen.getByText('Welcome')).toBeInTheDocument() // Category badge
      expect(screen.getByText('active')).toBeInTheDocument() // Status badge
      expect(screen.getByText('15 uses')).toBeInTheDocument()
    })
    it('displays favorite star for favorite templates', () => {
          template={mockFavoriteTemplate}
      const favoriteIcon = screen.getByTitle('favorite')
      expect(favoriteIcon).toBeInTheDocument()
      expect(favoriteIcon).toHaveClass('fill-current', 'text-yellow-500')
    it('shows tags when available', () => {
      expect(screen.getByText('onboarding')).toBeInTheDocument()
      expect(screen.getByText('welcome')).toBeInTheDocument()
  describe('List View Rendering', () => {
    it('renders template information correctly in list view', () => {
          viewMode="list"
      expect(screen.getByText('15')).toBeInTheDocument() // Usage count
      expect(screen.getByText('John Doe')).toBeInTheDocument() // Author
    it('displays relative time correctly', () => {
      // Should show relative time like "X days ago"
      expect(screen.getByText(/ago$/)).toBeInTheDocument()
  describe('Selection Behavior', () => {
    it('calls onSelect when card is clicked in normal mode', async () => {
      const user = userEvent.setup()
      const card = screen.getByTestId('template-card')
      await user.click(card)
      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplate)
    it('calls onSelectTemplate in selection mode', async () => {
      const mockOnSelectTemplate = jest.fn()
          onSelect={mockOnSelectTemplate}
          selectionMode
      expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplate)
    it('toggles selection when checkbox is clicked', async () => {
      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)
      expect(mockOnToggleSelect).toHaveBeenCalledWith('1', true)
    it('shows selected state correctly', () => {
          selected={true}
      expect(card).toHaveClass('ring-2', 'ring-purple-500')
      expect(checkbox).toBeChecked()
  describe('Actions Menu', () => {
    it('opens actions menu when clicked', async () => {
      const moreButton = screen.getByRole('button', { name: /more options/i })
      await user.click(moreButton)
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByText('Duplicate')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    it('calls onAction with correct parameters for edit', async () => {
      const editButton = screen.getByText('Edit')
      await user.click(editButton)
      expect(mockOnAction).toHaveBeenCalledWith('1', 'edit')
    it('calls onAction with correct parameters for duplicate', async () => {
      const duplicateButton = screen.getByText('Duplicate')
      await user.click(duplicateButton)
      expect(mockOnAction).toHaveBeenCalledWith('1', 'duplicate')
    it('calls onAction with correct parameters for favorite toggle', async () => {
      const favoriteButton = screen.getByText('Add to favorites')
      await user.click(favoriteButton)
      expect(mockOnAction).toHaveBeenCalledWith('1', 'favorite')
    it('shows different favorite text for favorite templates', async () => {
      expect(screen.getByText('Remove from favorites')).toBeInTheDocument()
  describe('Preview Functionality', () => {
    it('opens preview modal when preview button is clicked', async () => {
      const previewButton = screen.getByRole('button', { name: /preview/i })
      await user.click(previewButton)
      expect(screen.getByText('Preview: Welcome Email Template')).toBeInTheDocument()
      expect(screen.getByText('Subject:')).toBeInTheDocument()
    it('displays template content in preview modal', async () => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument()
      expect(screen.getByText('Thank you for choosing us for your special day.')).toBeInTheDocument()
    it('closes preview modal when close button is clicked', async () => {
      // Open preview
      // Close preview
      const closeButton = screen.getByRole('button', { name: '×' })
      await user.click(closeButton)
      expect(screen.queryByText('Preview: Welcome Email Template')).not.toBeInTheDocument()
  describe('Status Indicators', () => {
    it('shows correct colors for different statuses', () => {
      const activeTemplate = { ...mockTemplate, status: 'active' as const }
      const { rerender } = render(
          template={activeTemplate}
      let statusBadge = screen.getByText('active')
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800')
      const draftTemplate = { ...mockTemplate, status: 'draft' as const }
      rerender(
          template={draftTemplate}
      statusBadge = screen.getByText('draft')
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  describe('Event Propagation', () => {
    it('prevents card click when actions menu is clicked', async () => {
      // onSelect should not have been called
      expect(mockOnSelect).not.toHaveBeenCalled()
    it('prevents card click when checkbox is clicked', async () => {
      // But onToggleSelect should have been called
      expect(mockOnToggleSelect).toHaveBeenCalled()
  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      // Tab to checkbox
      await user.tab()
      expect(screen.getByRole('checkbox')).toHaveFocus()
      // Tab to actions button
      expect(screen.getByRole('button', { name: /more options/i })).toHaveFocus()
  describe('Content Truncation', () => {
    it('truncates long template names in grid view', () => {
      const longNameTemplate = {
        ...mockTemplate,
        name: 'This is a very long template name that should be truncated in the UI to prevent overflow',
      }
          template={longNameTemplate}
      const templateName = screen.getByText(longNameTemplate.name)
      expect(templateName).toHaveClass('truncate')
    it('truncates long content preview', () => {
      const longContentTemplate = {
        content: '<p>' + 'A'.repeat(200) + '</p>',
          template={longContentTemplate}
      // Content should be truncated and line-clamped
      const contentPreview = screen.getByText(/^A+/)
      expect(contentPreview).toHaveClass('line-clamp-3')
  describe('Active State', () => {
    it('shows active styling when isActive is true', () => {
          isActive={true}
      expect(card).toHaveClass('ring-2', 'ring-blue-500')
})
