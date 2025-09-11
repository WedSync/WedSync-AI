import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { jest } from '@jest/globals'
import { BudgetOverview } from '@/components/wedme/budget/BudgetOverview'

// Mock fetch globally
global.fetch = jest.fn()
const mockCategories = [
  {
    id: '1',
    name: 'Venue',
    budgeted_amount: 10000,
    spent_amount: 8000,
    percentage_of_total: 40,
    color: '#9E77ED'
  },
    id: '2', 
    name: 'Catering',
    budgeted_amount: 6000,
    spent_amount: 3000,
    percentage_of_total: 25,
    color: '#2E90FA'
  }
]
const mockTransactions = [
    amount: 5000,
    description: 'Venue deposit',
    category: 'Venue',
    date: '2025-01-15T00:00:00Z',
    vendor: 'Grand Ballroom'
    id: '2',
    amount: 2000,
    description: 'Catering tasting',
    category: 'Catering', 
    date: '2025-01-10T00:00:00Z',
    vendor: 'Fine Dining Co'
const defaultProps = {
  clientId: 'client-123',
  totalBudget: 25000,
  onAddTransaction: jest.fn(),
  onManageCategories: jest.fn()
}
describe('BudgetOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/budget/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: mockCategories })
        })
      }
      if (url.includes('/api/budget/transactions')) {
          json: () => Promise.resolve({ transactions: mockTransactions })
      return Promise.resolve({ ok: false })
    })
  })
  it('renders loading state initially', () => {
    render(<BudgetOverview {...defaultProps} />)
    expect(screen.getByText('Budget Overview')).toBeInTheDocument()
    // Check for loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  it('displays budget summary cards after loading', async () => {
    await waitFor(() => {
      expect(screen.getByText('Total Budget')).toBeInTheDocument()
      expect(screen.getByText('$25,000')).toBeInTheDocument()
      expect(screen.getByText('Total Spent')).toBeInTheDocument()
      expect(screen.getByText('Remaining')).toBeInTheDocument()
      expect(screen.getByText('At Risk')).toBeInTheDocument()
  it('calculates and displays correct spending totals', async () => {
      // Total spent should be 11,000 (8000 + 3000)
      expect(screen.getByText('$11,000')).toBeInTheDocument()
      // Remaining should be 14,000 (25000 - 11000)
      expect(screen.getByText('$14,000')).toBeInTheDocument()
  it('shows progress bar with correct percentage', async () => {
      // 11000/25000 = 44%
      expect(screen.getByText('44.0% of budget used')).toBeInTheDocument()
  it('displays budget categories with correct progress', async () => {
      expect(screen.getByText('Venue')).toBeInTheDocument()
      expect(screen.getByText('Catering')).toBeInTheDocument()
      expect(screen.getByText('$8,000 / $10,000')).toBeInTheDocument()
      expect(screen.getByText('$3,000 / $6,000')).toBeInTheDocument()
  it('shows categories at risk correctly', async () => {
    // Mock category with high spending
    const riskyCategories = [
      {
        ...mockCategories[0],
        spent_amount: 9500, // 95% of budget
        budgeted_amount: 10000
      },
      mockCategories[1]
    ]
          json: () => Promise.resolve({ categories: riskyCategories })
      expect(screen.getByText('1')).toBeInTheDocument() // At Risk count
  it('displays recent transactions', async () => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument()
      expect(screen.getByText('Fine Dining Co')).toBeInTheDocument()
      expect(screen.getByText('-$5,000')).toBeInTheDocument()
      expect(screen.getByText('-$2,000')).toBeInTheDocument()
  it('shows over-budget alert when spending exceeds budget', async () => {
    const overBudgetProps = {
      ...defaultProps,
      totalBudget: 5000 // Less than total spent (11000)
    }
    render(<BudgetOverview {...overBudgetProps} />)
      expect(screen.getByText('Budget Alerts')).toBeInTheDocument()
      expect(screen.getByText(/over your total budget/)).toBeInTheDocument()
  it('calls onAddTransaction when Add Expense is clicked', async () => {
      const addButton = screen.getByText('Add Expense')
      fireEvent.click(addButton)
      expect(defaultProps.onAddTransaction).toHaveBeenCalledTimes(1)
  it('calls onManageCategories when Manage button is clicked', async () => {
      const manageButton = screen.getByText('Manage')
      fireEvent.click(manageButton)
      expect(defaultProps.onManageCategories).toHaveBeenCalledTimes(1)
  it('handles API error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({ ok: false })
    )
      expect(screen.getByText('Failed to Load Budget')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
  it('retries loading when Try Again is clicked', async () => {
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({ ok: false }))
      .mockImplementation((url: string) => {
        if (url.includes('/api/budget/categories')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ categories: mockCategories })
          })
        }
        if (url.includes('/api/budget/transactions')) {
            json: () => Promise.resolve({ transactions: mockTransactions })
        return Promise.resolve({ ok: false })
      })
    fireEvent.click(screen.getByText('Try Again'))
  it('shows empty state when no categories exist', async () => {
          json: () => Promise.resolve({ categories: [] })
          json: () => Promise.resolve({ transactions: [] })
      expect(screen.getByText('No budget categories set up yet')).toBeInTheDocument()
      expect(screen.getByText('Set up categories')).toBeInTheDocument()
  it('shows empty transactions state', async () => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument()
  it('changes time period when period selector is clicked', async () => {
      expect(screen.getByText('Month')).toBeInTheDocument()
      expect(screen.getByText('Week')).toBeInTheDocument()
      expect(screen.getByText('Quarter')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Week'))
      // Verify API is called with different parameters
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/budget/transactions?client_id=client-123')
      )
  it('formats currency correctly', async () => {
      // Should format without decimals for whole numbers
  it('calculates percentage correctly', async () => {
      // 11000 / 25000 * 100 = 44%
      expect(screen.getByText('44.0%')).toBeInTheDocument()
})
