import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { RealtimeBudgetTracker } from '@/components/dashboard/realtime/RealtimeBudgetTracker'
import { useRealtimeConnection } from '@/hooks/useRealtime'
import type { BudgetUpdate } from '@/types/realtime'

// Mock the realtime hook
jest.mock('@/hooks/useRealtime')

describe('RealtimeBudgetTracker', () => {
  const mockSend = jest.fn()
  const mockBudget = {
    id: 'budget-1',
    total: 50000,
    spent: 15000,
    remaining: 35000,
    categories: [
      {
        id: 'cat-1',
        name: 'Venue',
        budget: 15000,
        spent: 10000,
        remaining: 5000,
        items: [
          { id: 'item-1', name: 'Ceremony', amount: 5000, paid: true },
          { id: 'item-2', name: 'Reception', amount: 5000, paid: true },
        ],
      },
      {
        id: 'cat-2',
        name: 'Catering',
        budget: 20000,
        spent: 5000,
        remaining: 15000,
        items: [
          { id: 'item-3', name: 'Food', amount: 3000, paid: true },
          { id: 'item-4', name: 'Drinks', amount: 2000, paid: true },
        ],
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRealtimeConnection as jest.Mock).mockReturnValue({
      isConnected: true,
      connectionState: 'connected',
      send: mockSend,
      latency: 50,
    })
  })

  describe('Budget Display', () => {
    it('should display initial budget summary', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      expect(screen.getByText(/Total Budget:/)).toBeInTheDocument()
      expect(screen.getByText('$50,000')).toBeInTheDocument()
      expect(screen.getByText(/Spent:/)).toBeInTheDocument()
      expect(screen.getByText('$15,000')).toBeInTheDocument()
      expect(screen.getByText(/Remaining:/)).toBeInTheDocument()
      expect(screen.getByText('$35,000')).toBeInTheDocument()
    })

    it('should display budget categories', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      expect(screen.getByText('Venue')).toBeInTheDocument()
      expect(screen.getByText('Catering')).toBeInTheDocument()
    })

    it('should display budget progress bars', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars).toHaveLength(3) // Total + 2 categories
      
      // Check venue progress (66.67% spent)
      expect(progressBars[1]).toHaveAttribute('aria-valuenow', '66.67')
      
      // Check catering progress (25% spent)
      expect(progressBars[2]).toHaveAttribute('aria-valuenow', '25')
    })

    it('should show warning for categories over budget', () => {
      const overBudget = {
        ...mockBudget,
        categories: [
          {
            ...mockBudget.categories[0],
            spent: 16000,
            remaining: -1000,
          },
        ],
      }
      
      render(<RealtimeBudgetTracker budget={overBudget} />)
      
      expect(screen.getByText(/Over budget/i)).toBeInTheDocument()
      expect(screen.getByTestId('budget-warning')).toHaveClass('text-red-600')
    })
  })

  describe('Real-time Updates', () => {
    it('should handle expense added updates', async () => {
      const { rerender } = render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      const update: BudgetUpdate = {
        categoryId: 'cat-1',
        categoryName: 'Venue',
        previousAmount: 10000,
        newAmount: 12000,
        changeType: 'expense_added',
        description: 'Added decoration costs',
        timestamp: Date.now(),
        userId: 'user-1',
      }
      
      mockOnMessage({ type: 'budget_update', data: update })
      
      await waitFor(() => {
        expect(screen.getByText(/Added decoration costs/)).toBeInTheDocument()
      })
    })

    it('should handle expense removed updates', async () => {
      const { rerender } = render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      const update: BudgetUpdate = {
        categoryId: 'cat-2',
        categoryName: 'Catering',
        previousAmount: 5000,
        newAmount: 3000,
        changeType: 'expense_removed',
        description: 'Removed drinks package',
        timestamp: Date.now(),
        userId: 'user-1',
      }
      
      mockOnMessage({ type: 'budget_update', data: update })
      
      await waitFor(() => {
        expect(screen.getByText(/Removed drinks package/)).toBeInTheDocument()
      })
    })

    it('should handle payment made updates', async () => {
      const { rerender } = render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      const update: BudgetUpdate = {
        categoryId: 'cat-1',
        categoryName: 'Venue',
        previousAmount: 10000,
        newAmount: 10000,
        changeType: 'payment_made',
        description: 'Paid venue deposit',
        timestamp: Date.now(),
        userId: 'user-1',
      }
      
      mockOnMessage({ type: 'budget_update', data: update })
      
      await waitFor(() => {
        expect(screen.getByText(/Paid venue deposit/)).toBeInTheDocument()
      })
    })

    it('should handle budget adjusted updates', async () => {
      const { rerender } = render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      const update: BudgetUpdate = {
        categoryId: 'cat-2',
        categoryName: 'Catering',
        previousAmount: 20000,
        newAmount: 25000,
        changeType: 'budget_adjusted',
        description: 'Increased catering budget',
        timestamp: Date.now(),
        userId: 'user-1',
      }
      
      mockOnMessage({ type: 'budget_update', data: update })
      
      await waitFor(() => {
        expect(screen.getByText(/Increased catering budget/)).toBeInTheDocument()
      })
    })

    it('should show notifications for budget updates', async () => {
      render(<RealtimeBudgetTracker budget={mockBudget} showNotifications />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      const update: BudgetUpdate = {
        categoryId: 'cat-1',
        categoryName: 'Venue',
        previousAmount: 10000,
        newAmount: 11000,
        changeType: 'expense_added',
        description: 'Added lighting',
        timestamp: Date.now(),
        userId: 'user-1',
      }
      
      mockOnMessage({ type: 'budget_update', data: update })
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/Venue: Added lighting/)
      })
    })

    it('should animate budget changes', async () => {
      render(<RealtimeBudgetTracker budget={mockBudget} enableAnimations />)
      
      const mockOnMessage = (useRealtimeConnection as jest.Mock).mock.calls[0][1].onMessage
      
      const update: BudgetUpdate = {
        categoryId: 'cat-1',
        categoryName: 'Venue',
        previousAmount: 10000,
        newAmount: 12000,
        changeType: 'expense_added',
        timestamp: Date.now(),
        userId: 'user-1',
      }
      
      mockOnMessage({ type: 'budget_update', data: update })
      
      await waitFor(() => {
        const categoryElement = screen.getByTestId('category-cat-1')
        expect(categoryElement).toHaveClass('animate-pulse')
      })
    })
  })

  describe('User Interactions', () => {
    it('should allow adding new expense', async () => {
      render(<RealtimeBudgetTracker budget={mockBudget} allowEditing />)
      
      const addButton = screen.getByTestId('add-expense-cat-1')
      fireEvent.click(addButton)
      
      const nameInput = screen.getByPlaceholderText('Expense name')
      const amountInput = screen.getByPlaceholderText('Amount')
      
      fireEvent.change(nameInput, { target: { value: 'Flowers' } })
      fireEvent.change(amountInput, { target: { value: '500' } })
      
      const saveButton = screen.getByText('Add Expense')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith({
          type: 'budget_update',
          data: expect.objectContaining({
            categoryId: 'cat-1',
            changeType: 'expense_added',
            description: 'Added Flowers',
          }),
        })
      })
    })

    it('should allow removing expense', async () => {
      render(<RealtimeBudgetTracker budget={mockBudget} allowEditing />)
      
      const removeButton = screen.getByTestId('remove-expense-item-1')
      fireEvent.click(removeButton)
      
      const confirmButton = screen.getByText('Confirm')
      fireEvent.click(confirmButton)
      
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith({
          type: 'budget_update',
          data: expect.objectContaining({
            categoryId: 'cat-1',
            changeType: 'expense_removed',
          }),
        })
      })
    })

    it('should allow marking payment as made', async () => {
      render(<RealtimeBudgetTracker budget={mockBudget} allowEditing />)
      
      const unpaidItem = {
        ...mockBudget.categories[0].items[0],
        paid: false,
      }
      const budgetWithUnpaid = {
        ...mockBudget,
        categories: [{
          ...mockBudget.categories[0],
          items: [unpaidItem],
        }],
      }
      
      const { rerender } = render(<RealtimeBudgetTracker budget={budgetWithUnpaid} allowEditing />)
      
      const payButton = screen.getByTestId('pay-expense-item-1')
      fireEvent.click(payButton)
      
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith({
          type: 'budget_update',
          data: expect.objectContaining({
            changeType: 'payment_made',
          }),
        })
      })
    })

    it('should allow adjusting category budget', async () => {
      render(<RealtimeBudgetTracker budget={mockBudget} allowEditing />)
      
      const editButton = screen.getByTestId('edit-budget-cat-1')
      fireEvent.click(editButton)
      
      const input = screen.getByDisplayValue('15000')
      fireEvent.change(input, { target: { value: '18000' } })
      
      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)
      
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith({
          type: 'budget_update',
          data: expect.objectContaining({
            categoryId: 'cat-1',
            changeType: 'budget_adjusted',
            newAmount: 18000,
          }),
        })
      })
    })
  })

  describe('Budget Analytics', () => {
    it('should display spending trends', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} showAnalytics />)
      
      expect(screen.getByText(/Spending Trends/)).toBeInTheDocument()
      expect(screen.getByTestId('spending-chart')).toBeInTheDocument()
    })

    it('should show budget health indicators', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} showAnalytics />)
      
      expect(screen.getByText(/Budget Health/)).toBeInTheDocument()
      expect(screen.getByTestId('budget-health-good')).toBeInTheDocument()
    })

    it('should display category breakdown', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} showAnalytics />)
      
      expect(screen.getByTestId('category-breakdown-chart')).toBeInTheDocument()
      expect(screen.getByText(/66.7%/)).toBeInTheDocument() // Venue percentage
      expect(screen.getByText(/33.3%/)).toBeInTheDocument() // Catering percentage
    })

    it('should show payment schedule', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} showPaymentSchedule />)
      
      expect(screen.getByText(/Upcoming Payments/)).toBeInTheDocument()
      expect(screen.getByTestId('payment-schedule')).toBeInTheDocument()
    })
  })

  describe('Connection State', () => {
    it('should show offline indicator', () => {
      ;(useRealtimeConnection as jest.Mock).mockReturnValue({
        isConnected: false,
        connectionState: 'disconnected',
        send: mockSend,
      })
      
      render(<RealtimeBudgetTracker budget={mockBudget} />)
      
      expect(screen.getByText(/Working offline/)).toBeInTheDocument()
    })

    it('should queue updates when offline', async () => {
      ;(useRealtimeConnection as jest.Mock).mockReturnValue({
        isConnected: false,
        connectionState: 'disconnected',
        send: mockSend,
      })
      
      render(<RealtimeBudgetTracker budget={mockBudget} allowEditing />)
      
      const addButton = screen.getByTestId('add-expense-cat-1')
      fireEvent.click(addButton)
      
      const nameInput = screen.getByPlaceholderText('Expense name')
      fireEvent.change(nameInput, { target: { value: 'Offline expense' } })
      
      const saveButton = screen.getByText('Add Expense')
      fireEvent.click(saveButton)
      
      expect(screen.getByText(/Update queued/)).toBeInTheDocument()
    })
  })

  describe('Export and Reports', () => {
    it('should allow exporting budget to CSV', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} allowExport />)
      
      const exportButton = screen.getByTestId('export-csv')
      fireEvent.click(exportButton)
      
      // Check that download was triggered
      expect(screen.getByText(/Budget exported/)).toBeInTheDocument()
    })

    it('should allow exporting budget to PDF', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} allowExport />)
      
      const exportButton = screen.getByTestId('export-pdf')
      fireEvent.click(exportButton)
      
      expect(screen.getByText(/PDF generated/)).toBeInTheDocument()
    })

    it('should generate budget summary report', () => {
      render(<RealtimeBudgetTracker budget={mockBudget} showReports />)
      
      const reportButton = screen.getByText('Generate Report')
      fireEvent.click(reportButton)
      
      expect(screen.getByTestId('budget-report')).toBeInTheDocument()
      expect(screen.getByText(/Budget Summary Report/)).toBeInTheDocument()
    })
  })
})