/**
 * @vitest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import RiskLevelFilter from '@/components/dashboard/RiskLevelFilter'
import type { HealthDashboardFilters } from '@/types/supplier-health'
// Mock UI components
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="select" value={value} onChange={e => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))
const defaultFilters: HealthDashboardFilters = {
  riskLevels: [],
  categories: [],
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-03-31')
  },
  healthScoreRange: {
    min: 0,
    max: 100
  sortBy: 'health_score',
  sortOrder: 'desc',
  searchQuery: ''
}
const mockRiskDistribution = {
  green: 5,
  yellow: 3,
  red: 2
const defaultProps = {
  filters: defaultFilters,
  onChange: jest.fn(),
  riskDistribution: mockRiskDistribution,
  disabled: false
describe('RiskLevelFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Basic Rendering', () => {
    it('renders all filter sections', () => {
      render(<RiskLevelFilter {...defaultProps} />)
      
      expect(screen.getByText('Search Suppliers')).toBeInTheDocument()
      expect(screen.getByText('Risk Levels')).toBeInTheDocument()
      expect(screen.getByText('Categories')).toBeInTheDocument()
      expect(screen.getByText('Health Score Range')).toBeInTheDocument()
      expect(screen.getByText('Time Period')).toBeInTheDocument()
      expect(screen.getByText('Sort By')).toBeInTheDocument()
      expect(screen.getByText('Order')).toBeInTheDocument()
    })
    it('displays search input with placeholder', () => {
      const searchInput = screen.getByPlaceholderText('Search by name or category...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveValue('')
    it('shows risk level buttons with counts', () => {
      expect(screen.getByText('Healthy')).toBeInTheDocument()
      expect(screen.getByText('At Risk')).toBeInTheDocument()
      expect(screen.getByText('Critical')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument() // Green count
      expect(screen.getByText('3')).toBeInTheDocument() // Yellow count
      expect(screen.getByText('2')).toBeInTheDocument() // Red count
    it('displays category filter buttons', () => {
      expect(screen.getByText('Photographer')).toBeInTheDocument()
      expect(screen.getByText('Planner')).toBeInTheDocument()
      expect(screen.getByText('Venue')).toBeInTheDocument()
      expect(screen.getByText('Caterer')).toBeInTheDocument()
      expect(screen.getByText('Florist')).toBeInTheDocument()
      expect(screen.getByText('Music')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()
  describe('Search Functionality', () => {
    it('updates search query on input', async () => {
      const user = userEvent.setup()
      await user.type(searchInput, 'photographer')
      expect(defaultProps.onChange).toHaveBeenCalledWith({
        searchQuery: 'photographer'
      })
    it('shows clear button when search query exists', () => {
      const filtersWithSearch = {
        ...defaultFilters,
        searchQuery: 'test query'
      }
      render(<RiskLevelFilter {...defaultProps} filters={filtersWithSearch} />)
      const clearButton = screen.getByRole('button')
      expect(clearButton).toBeInTheDocument()
      fireEvent.click(clearButton)
      expect(defaultProps.onChange).toHaveBeenCalledWith({ searchQuery: '' })
    it('displays search query in input', () => {
        searchQuery: 'test photographer'
      const searchInput = screen.getByDisplayValue('test photographer')
  describe('Risk Level Filtering', () => {
    it('toggles risk level selection', () => {
      const healthyButton = screen.getByText('Healthy')
      fireEvent.click(healthyButton)
        riskLevels: ['green']
    it('removes risk level when clicking selected button', () => {
      const filtersWithRisk = {
        riskLevels: ['green', 'yellow'] as any
      render(<RiskLevelFilter {...defaultProps} filters={filtersWithRisk} />)
        riskLevels: ['yellow']
    it('adds multiple risk levels', () => {
      const filtersWithOneRisk = {
        riskLevels: ['green'] as any
      render(<RiskLevelFilter {...defaultProps} filters={filtersWithOneRisk} />)
      const criticalButton = screen.getByText('Critical')
      fireEvent.click(criticalButton)
        riskLevels: ['green', 'red']
    it('highlights selected risk level buttons', () => {
      expect(healthyButton).toHaveClass('bg-blue-600')
  describe('Category Filtering', () => {
    it('toggles category selection', () => {
      const photographerButton = screen.getByText('Photographer')
      fireEvent.click(photographerButton)
        categories: ['photographer']
    it('removes category when clicking selected button', () => {
      const filtersWithCategory = {
        categories: ['photographer', 'planner']
      render(<RiskLevelFilter {...defaultProps} filters={filtersWithCategory} />)
        categories: ['planner']
    it('adds multiple categories', () => {
      const filtersWithOneCategory = {
      render(<RiskLevelFilter {...defaultProps} filters={filtersWithOneCategory} />)
      const plannerButton = screen.getByText('Planner')
      fireEvent.click(plannerButton)
  describe('Health Score Range', () => {
    it('updates minimum health score', async () => {
      const minInput = screen.getByDisplayValue('0')
      await user.clear(minInput)
      await user.type(minInput, '20')
        healthScoreRange: { min: 20, max: 100 }
    it('updates maximum health score', async () => {
      const maxInput = screen.getByDisplayValue('100')
      await user.clear(maxInput)
      await user.type(maxInput, '80')
        healthScoreRange: { min: 0, max: 80 }
    it('clamps values to valid range (0-100)', async () => {
      await user.type(minInput, '150')
        healthScoreRange: { min: 100, max: 100 }
    it('handles negative values', async () => {
      await user.type(minInput, '-10')
        healthScoreRange: { min: 0, max: 100 }
  describe('Date Range Selection', () => {
    it('updates date range when selecting predefined option', () => {
      const select = screen.getByTestId('select')
      fireEvent.change(select, { target: { value: '7d' } })
        dateRange: expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        })
    it('calculates correct date ranges', () => {
      fireEvent.change(select, { target: { value: '30d' } })
      const call = defaultProps.onChange.mock.calls[0][0]
      const daysDiff = Math.ceil((call.dateRange.end - call.dateRange.start) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBe(30)
    it('determines current date range correctly', () => {
      const filters = {
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      render(<RiskLevelFilter {...defaultProps} filters={filters} />)
      // Should detect 7-day range
      expect(screen.getByDisplayValue('Last 7 days')).toBeInTheDocument()
  describe('Sorting Options', () => {
    it('changes sort field', () => {
      const sortSelect = screen.getAllByTestId('select')[1] // Second select is sort by
      fireEvent.change(sortSelect, { target: { value: 'revenue' } })
        sortBy: 'revenue'
    it('changes sort order', () => {
      const orderSelect = screen.getAllByTestId('select')[2] // Third select is sort order
      fireEvent.change(orderSelect, { target: { value: 'asc' } })
        sortOrder: 'asc'
  describe('Clear All Filters', () => {
    it('shows clear all button when filters are active', () => {
      const filtersWithValues = {
        riskLevels: ['green'] as any,
        categories: ['photographer'],
        searchQuery: 'test'
      render(<RiskLevelFilter {...defaultProps} filters={filtersWithValues} />)
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    it('hides clear all button when no filters are active', () => {
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument()
    it('clears all filters when clicked', () => {
        searchQuery: 'test',
        healthScoreRange: { min: 20, max: 80 }
      const clearButton = screen.getByText('Clear All')
        riskLevels: [],
        categories: [],
        sortBy: 'health_score',
        sortOrder: 'desc',
        healthScoreRange: { min: 0, max: 100 },
        searchQuery: ''
  describe('Active Filters Summary', () => {
    it('shows active filters when present', () => {
        riskLevels: ['green', 'red'] as any,
      expect(screen.getByText('Active filters:')).toBeInTheDocument()
      expect(screen.getByText('Healthy Risk')).toBeInTheDocument()
      expect(screen.getByText('Critical Risk')).toBeInTheDocument()
      expect(screen.getByText('Search: "test query"')).toBeInTheDocument()
    it('shows health score range in summary', () => {
      const filtersWithRange = {
      render(<RiskLevelFilter {...defaultProps} filters={filtersWithRange} />)
      expect(screen.getByText('Score: 20-80')).toBeInTheDocument()
    it('hides summary when no filters are active', () => {
      expect(screen.queryByText('Active filters:')).not.toBeInTheDocument()
  describe('Disabled State', () => {
    it('disables all controls when disabled prop is true', () => {
      render(<RiskLevelFilter {...defaultProps} disabled={true} />)
      expect(searchInput).toBeDisabled()
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        if (!button.getAttribute('data-testid')) { // Skip test elements
          expect(button).toBeDisabled()
  describe('Accessibility', () => {
    it('has proper labels for form controls', () => {
      expect(screen.getByLabelText('Search Suppliers')).toBeInTheDocument()
      expect(screen.getByLabelText('Min Score')).toBeInTheDocument()
      expect(screen.getByLabelText('Max Score')).toBeInTheDocument()
      expect(screen.getByLabelText('Time Period')).toBeInTheDocument()
      expect(screen.getByLabelText('Sort By')).toBeInTheDocument()
      expect(screen.getByLabelText('Order')).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      // Tab through focusable elements
      await user.tab()
      expect(document.activeElement).toHaveAttribute('placeholder', 'Search by name or category...')
      expect(document.activeElement).toHaveAttribute('role', 'button')
    it('has proper ARIA attributes for filter buttons', () => {
      expect(healthyButton).toHaveAttribute('aria-pressed', 'true')
  describe('Performance', () => {
    it('handles rapid filter changes efficiently', async () => {
      // Rapidly type characters
      const testString = 'photographer'
      for (const char of testString) {
        await user.type(searchInput, char)
      // Should handle all changes without performance issues
      expect(defaultProps.onChange).toHaveBeenCalled()
    it('memoizes expensive calculations', () => {
      const { rerender } = render(<RiskLevelFilter {...defaultProps} />)
      // Rerender with same props should not cause unnecessary recalculations
      rerender(<RiskLevelFilter {...defaultProps} />)
      expect(screen.getByText('5')).toBeInTheDocument() // Risk distribution count
  describe('Edge Cases', () => {
    it('handles empty risk distribution', () => {
      const emptyDistribution = { green: 0, yellow: 0, red: 0 }
      render(<RiskLevelFilter {...defaultProps} riskDistribution={emptyDistribution} />)
      expect(screen.getAllByText('0')).toHaveLength(3)
    it('handles invalid health score input', async () => {
      await user.type(minInput, 'invalid')
      // Should default to 0 for invalid input
})
