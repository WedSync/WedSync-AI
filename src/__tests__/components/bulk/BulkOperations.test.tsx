import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { BulkActionsBar, BulkActionsToolbar } from '@/components/clients/BulkActionsBar'
import { BulkSelectionProvider, useBulkSelection } from '@/components/clients/bulk/BulkSelectionProvider'
import { BulkProgressModal } from '@/components/clients/bulk/BulkProgressModal'
import { MobileBulkActions } from '@/components/clients/bulk/MobileBulkActions'
import { useBulkOperations } from '@/hooks/useBulkOperations'
import { ClientData } from '@/components/clients/ClientListViews'

// Mock data
const mockClients: ClientData[] = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    partner_first_name: 'Jane',
    partner_last_name: 'Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    wedding_date: '2024-06-15',
    venue_name: 'Grand Hotel',
    status: 'booked',
    package_name: 'Premium',
    package_price: 5000,
    is_wedme_connected: true,
    created_at: '2023-01-01T00:00:00Z'
  },
    id: '2',
    first_name: 'Bob',
    last_name: 'Smith',
    partner_first_name: 'Alice',
    partner_last_name: 'Smith',
    email: 'bob@example.com',
    phone: '+1234567891',
    wedding_date: '2024-08-20',
    venue_name: 'Beach Resort',
    status: 'lead',
    package_name: 'Basic',
    package_price: 3000,
    is_wedme_connected: false,
    created_at: '2023-01-02T00:00:00Z'
  }
]
// Mock hooks
jest.mock('@/hooks/useBulkOperations')
const mockUseBulkOperations = useBulkOperations as jest.MockedFunction<typeof useBulkOperations>
// Helper component to test BulkSelectionProvider
function TestBulkSelection({ children }: { children: React.ReactNode }) {
  return (
    <BulkSelectionProvider maxSelection={100}>
      {children}
    </BulkSelectionProvider>
  )
}
function BulkSelectionConsumer() {
  const bulkSelection = useBulkSelection()
    <div>
      <span data-testid="selection-count">{bulkSelection.selectionCount}</span>
      <span data-testid="selection-mode">{bulkSelection.isSelectionMode.toString()}</span>
      <button
        data-testid="toggle-selection"
        onClick={() => bulkSelection.toggleSelection('1')}
      >
        Toggle
      </button>
        data-testid="select-all"
        onClick={() => bulkSelection.selectAll(mockClients)}
        Select All
        data-testid="clear-selection"
        onClick={() => bulkSelection.clearSelection()}
        Clear
    </div>
describe('BulkActionsBar', () => {
  const defaultProps = {
    selectedCount: 2,
    totalCount: 10,
    onAction: jest.fn(),
    onClear: jest.fn(),
    isVisible: true
  beforeEach(() => {
    jest.clearAllMocks()
  })
  test('renders with correct selection count', () => {
    render(<BulkActionsBar {...defaultProps} />)
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByText('of 10 total')).toBeInTheDocument()
  test('does not render when not visible', () => {
    render(<BulkActionsBar {...defaultProps} isVisible={false} />)
    expect(screen.queryByText('2 selected')).not.toBeInTheDocument()
  test('does not render when no items selected', () => {
    render(<BulkActionsBar {...defaultProps} selectedCount={0} />)
    expect(screen.queryByText('0 selected')).not.toBeInTheDocument()
  test('calls onAction when action button clicked', () => {
    fireEvent.click(screen.getByTestId('bulk-action-email'))
    expect(defaultProps.onAction).toHaveBeenCalledWith('email')
  test('calls onClear when clear button clicked', () => {
    fireEvent.click(screen.getByLabelText('Clear selection'))
    expect(defaultProps.onClear).toHaveBeenCalled()
  test('expands on double tap', async () => {
    const expandButton = screen.getByLabelText('Expand actions')
    
    // Simulate double tap
    fireEvent.click(expandButton)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    await waitFor(() => {
      expect(screen.getByText('Update Status')).toBeInTheDocument()
})
describe('BulkActionsToolbar (Desktop)', () => {
    selectedCount: 3,
    totalCount: 15,
  test('renders desktop toolbar correctly', () => {
    render(<BulkActionsToolbar {...defaultProps} />)
    expect(screen.getByText('3 selected')).toBeInTheDocument()
    expect(screen.getByText('of 15 total')).toBeInTheDocument()
  test('has all action buttons', () => {
    expect(screen.getByTestId('bulk-action-email')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-action-form')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-action-tag')).toBeInTheDocument()
    expect(screen.getByTestId('bulk-action-more')).toBeInTheDocument()
describe('BulkSelectionProvider', () => {
  test('provides bulk selection context', () => {
    render(
      <TestBulkSelection>
        <BulkSelectionConsumer />
      </TestBulkSelection>
    )
    expect(screen.getByTestId('selection-count')).toHaveTextContent('0')
    expect(screen.getByTestId('selection-mode')).toHaveTextContent('false')
  test('toggles single selection', () => {
    fireEvent.click(screen.getByTestId('toggle-selection'))
    expect(screen.getByTestId('selection-count')).toHaveTextContent('1')
    expect(screen.getByTestId('selection-mode')).toHaveTextContent('true')
  test('selects all items', () => {
    fireEvent.click(screen.getByTestId('select-all'))
    expect(screen.getByTestId('selection-count')).toHaveTextContent('2')
  test('clears selection', () => {
    // First select items
    // Then clear
    fireEvent.click(screen.getByTestId('clear-selection'))
  test('respects maximum selection limit', () => {
      <BulkSelectionProvider maxSelection={1}>
      </BulkSelectionProvider>
    // Should only select 1 item due to max limit
describe('BulkProgressModal', () => {
  const mockProgress = {
    operation: 'email',
    total: 10,
    completed: 5,
    failed: 1,
    percentage: 50,
    currentBatch: 2,
    totalBatches: 4,
    errors: [
      { id: '1', error: 'Failed to send email' }
    ]
  test('renders progress modal correctly', () => {
      <BulkProgressModal
        isOpen={true}
        onClose={jest.fn()}
        operation="email"
        progress={mockProgress}
      />
    expect(screen.getByText('Sending Emails')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // Completed count
    expect(screen.getByText('1')).toBeInTheDocument() // Failed count
  test('shows completion state', () => {
    const completedProgress = {
      ...mockProgress,
      percentage: 100,
      completed: 9,
      failed: 1
    }
        progress={completedProgress}
    expect(screen.getByText('1 Error Occurred')).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  test('shows error details', () => {
    expect(screen.getByText('Failed to send email')).toBeInTheDocument()
  test('calls onRetry when retry button clicked', () => {
    const onRetry = jest.fn()
    const completedProgress = { ...mockProgress, percentage: 100 }
        onRetry={onRetry}
    fireEvent.click(screen.getByText('Retry Failed'))
    expect(onRetry).toHaveBeenCalled()
describe('MobileBulkActions', () => {
    isOpen: true,
    onClose: jest.fn(),
    selectedClients: mockClients,
    onExecute: jest.fn().mockResolvedValue(undefined)
  test('renders action selector', () => {
    render(<MobileBulkActions {...defaultProps} />)
    expect(screen.getByText('2 Selected')).toBeInTheDocument()
    expect(screen.getByText('Choose an action to perform')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bulk-email')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-bulk-form')).toBeInTheDocument()
  test('navigates to configuration step', () => {
    fireEvent.click(screen.getByTestId('mobile-bulk-email'))
    expect(screen.getByText('Send Email')).toBeInTheDocument()
    expect(screen.getByText('Email Template')).toBeInTheDocument()
  test('configures email action', async () => {
    // Navigate to email configuration
    // Select template
    fireEvent.click(screen.getByText('Timeline Request'))
    // Execute action
    fireEvent.click(screen.getByText('Execute Send Email'))
      expect(defaultProps.onExecute).toHaveBeenCalledWith('email', {
        template: 'timeline_request'
      })
  test('closes on backdrop click', () => {
    fireEvent.click(document.querySelector('.bg-gray-900\\/50')!)
    expect(defaultProps.onClose).toHaveBeenCalled()
describe('useBulkOperations hook', () => {
    mockUseBulkOperations.mockReturnValue({
      progress: null,
      isProcessing: false,
      error: null,
      executeOperation: jest.fn(),
      cancelOperation: jest.fn(),
      clearProgress: jest.fn(),
      retryLastOperation: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      exportClients: jest.fn()
  test('provides bulk operations functionality', () => {
    const { result } = renderHook(() => useBulkOperations())
    expect(result.current).toHaveProperty('executeOperation')
    expect(result.current).toHaveProperty('cancelOperation')
    expect(result.current).toHaveProperty('clearProgress')
    expect(result.current).toHaveProperty('exportClients')
// Integration tests
describe('Bulk Operations Integration', () => {
  test('complete bulk email workflow', async () => {
    const mockExecute = jest.fn().mockResolvedValue({
      operation: 'email',
      total: 2,
      completed: 2,
      failed: 0,
      currentBatch: 1,
      totalBatches: 1,
      errors: []
      executeOperation: mockExecute,
    const TestComponent = () => {
      const [showActions, setShowActions] = useState(false)
      const [selectedCount, setSelectedCount] = useState(0)
      return (
        <TestBulkSelection>
          <div>
            <BulkActionsBar
              selectedCount={selectedCount}
              totalCount={10}
              onAction={() => setShowActions(true)}
              onClear={() => setSelectedCount(0)}
              isVisible={selectedCount > 0}
            />
            <MobileBulkActions
              isOpen={showActions}
              onClose={() => setShowActions(false)}
              selectedClients={mockClients.slice(0, selectedCount)}
              onExecute={mockExecute}
            <button
              data-testid="select-clients"
              onClick={() => setSelectedCount(2)}
            >
              Select 2 Clients
            </button>
          </div>
        </TestBulkSelection>
      )
    render(<TestComponent />)
    // Select clients
    fireEvent.click(screen.getByTestId('select-clients'))
    // Open bulk actions
    // Configure email
    // Execute
      expect(mockExecute).toHaveBeenCalledWith('email', {
// Performance tests
describe('Bulk Operations Performance', () => {
  test('handles large selection efficiently', () => {
    const largeClientList = Array.from({ length: 10000 }, (_, i) => ({
      ...mockClients[0],
      id: `client-${i}`,
      first_name: `Client${i}`
    }))
    const start = performance.now()
      <BulkSelectionProvider maxSelection={10000}>
    const end = performance.now()
    // Should render quickly even with large dataset
    expect(end - start).toBeLessThan(100) // 100ms threshold
// Accessibility tests
describe('Bulk Operations Accessibility', () => {
  test('has proper ARIA labels', () => {
      <BulkActionsBar
        selectedCount={2}
        totalCount={10}
        onAction={jest.fn()}
        onClear={jest.fn()}
        isVisible={true}
    expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
    expect(screen.getByLabelText('Expand actions')).toBeInTheDocument()
  test('supports keyboard navigation', () => {
    const clearButton = screen.getByLabelText('Clear selection')
    clearButton.focus()
    expect(clearButton).toHaveFocus()
// Test helper functions
function renderHook(hook: () => any) {
  let result: any
  function TestComponent() {
    result = hook()
    return null
  render(<TestComponent />)
  return { result }
