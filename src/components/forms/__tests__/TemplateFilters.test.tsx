import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { TemplateFilters } from '../TemplateFilters'
import { EmailTemplateFilters } from '@/types/email-template-library'

describe('TemplateFilters', () => {
  const mockFilters: EmailTemplateFilters = {
    categories: [],
    statuses: [],
    showFavorites: false,
    dateRange: undefined,
    usageRange: undefined,
    sortBy: 'created_at_desc'
  }
  const mockOnFiltersChange = jest.fn()
  const mockOnClearFilters = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Component Rendering', () => {
    it('renders all filter sections', () => {
      render(
        <TemplateFilters
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onClearFilters={mockOnClearFilters}
        />
      )
      expect(screen.getByText('Categories')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Sort By')).toBeInTheDocument()
      expect(screen.getByText('Date Range')).toBeInTheDocument()
      expect(screen.getByText('Usage Count')).toBeInTheDocument()
    })
    it('displays clear filters button when filters are applied', () => {
      const filtersWithValues = {
        ...mockFilters,
        categories: ['welcome'],
        statuses: ['active']
      }
          filters={filtersWithValues}
      expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument()
    it('does not show clear filters button when no filters applied', () => {
      expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument()
  describe('Category Filters', () => {
    it('allows selecting categories', async () => {
      const user = userEvent.setup()
      const welcomeCheckbox = screen.getByRole('checkbox', { name: /welcome/i })
      await user.click(welcomeCheckbox)
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        categories: ['welcome']
      })
    it('allows deselecting categories', async () => {
      const filtersWithCategory = {
          filters={filtersWithCategory}
        categories: []
    it('shows category counts', () => {
      const templateCounts = {
        welcome: 5,
        payment_reminder: 3,
        meeting_confirmation: 2,
        thank_you: 1,
        client_communication: 4
          templateCounts={templateCounts}
      expect(screen.getByText('5')).toBeInTheDocument() // welcome count
      expect(screen.getByText('3')).toBeInTheDocument() // payment_reminder count
      expect(screen.getByText('4')).toBeInTheDocument() // client_communication count
  describe('Status Filters', () => {
    it('allows selecting status filters', async () => {
      const activeCheckbox = screen.getByRole('checkbox', { name: /active/i })
      await user.click(activeCheckbox)
    it('allows multiple status selections', async () => {
      const draftCheckbox = screen.getByRole('checkbox', { name: /draft/i })
      
      await user.click(draftCheckbox)
        statuses: ['active', 'draft']
  describe('Favorites Filter', () => {
    it('toggles favorites filter', async () => {
      const favoritesSwitch = screen.getByRole('switch', { name: /show favorites only/i })
      await user.click(favoritesSwitch)
        showFavorites: true
  describe('Sort Options', () => {
    it('changes sort order', async () => {
      const sortSelect = screen.getByDisplayValue('Newest first')
      await user.selectOptions(sortSelect, 'name_asc')
        sortBy: 'name_asc'
    it('displays correct sort option labels', () => {
      expect(sortSelect).toBeInTheDocument()
      // Check that all sort options are available
      expect(screen.getByRole('option', { name: 'Newest first' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Oldest first' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Name A-Z' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Name Z-A' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Most used' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Least used' })).toBeInTheDocument()
  describe('Date Range Filter', () => {
    it('allows setting date range', async () => {
      const fromInput = screen.getByLabelText(/from date/i)
      const toInput = screen.getByLabelText(/to date/i)
      await user.type(fromInput, '2025-01-01')
      await user.type(toInput, '2025-01-31')
      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...mockFilters,
          dateRange: {
            from: new Date('2025-01-01'),
            to: new Date('2025-01-31')
          }
        })
    it('clears date range when inputs are cleared', async () => {
      const filtersWithDateRange = {
        dateRange: {
          from: new Date('2025-01-01'),
          to: new Date('2025-01-31')
        }
          filters={filtersWithDateRange}
      await user.clear(fromInput)
        dateRange: undefined
  describe('Usage Range Filter', () => {
    it('allows setting usage range', async () => {
      const minInput = screen.getByLabelText(/minimum usage/i)
      const maxInput = screen.getByLabelText(/maximum usage/i)
      await user.type(minInput, '1')
      await user.type(maxInput, '10')
          usageRange: {
            min: 1,
            max: 10
    it('validates usage range inputs', async () => {
      // Test invalid range (min > max)
      await user.type(minInput, '10')
      await user.type(maxInput, '5')
      expect(screen.getByText(/minimum must be less than maximum/i)).toBeInTheDocument()
  describe('Filter Presets', () => {
    it('applies popular templates preset', async () => {
      const presetButton = screen.getByRole('button', { name: /popular templates/i })
      await user.click(presetButton)
        usageRange: { min: 5, max: undefined },
        sortBy: 'usage_count_desc'
    it('applies recent templates preset', async () => {
      const presetButton = screen.getByRole('button', { name: /recent templates/i })
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          from: expect.any(Date),
          to: undefined
        },
        sortBy: 'created_at_desc'
  describe('Clear Filters', () => {
    it('calls onClearFilters when clear button is clicked', async () => {
        statuses: ['active'],
      const clearButton = screen.getByRole('button', { name: /clear all filters/i })
      await user.click(clearButton)
      expect(mockOnClearFilters).toHaveBeenCalled()
  describe('Collapsible Sections', () => {
    it('toggles collapsible sections', async () => {
      const categoryHeader = screen.getByRole('button', { name: /categories/i })
      await user.click(categoryHeader)
      // Should collapse the categories section
      expect(screen.queryByRole('checkbox', { name: /welcome/i })).not.toBeInTheDocument()
      // Click again to expand
      expect(screen.getByRole('checkbox', { name: /welcome/i })).toBeInTheDocument()
  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      expect(screen.getByRole('region', { name: /template filters/i })).toBeInTheDocument()
      expect(screen.getAllByRole('checkbox')).toHaveLength(expect.any(Number))
      expect(screen.getByRole('switch')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      // Tab through filter controls
      await user.tab()
      expect(screen.getByRole('checkbox', { name: /welcome/i })).toHaveFocus()
      expect(screen.getByRole('checkbox', { name: /payment reminder/i })).toHaveFocus()
  describe('Filter Count Display', () => {
    it('shows active filter count', () => {
        categories: ['welcome', 'payment_reminder'],
      expect(screen.getByText('4 filters applied')).toBeInTheDocument()
    it('does not show filter count when no filters applied', () => {
      expect(screen.queryByText(/filters applied/i)).not.toBeInTheDocument()
})
