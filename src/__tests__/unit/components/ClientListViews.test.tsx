import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render, generateWeddingTestData, expectWeddingData } from '../../../../tests/utils/test-utils'
import { ClientListViews } from '@/components/clients/ClientListViews'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))
// Mock bulk selection hook
vi.mock('@/components/clients/bulk/BulkSelectionInterface', () => ({
  useBulkSelection: () => ({
    selectedIds: [],
    isSelected: vi.fn(() => false),
    toggleSelection: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    bulkActions: [],
  BulkSelectionInterface: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
describe('ClientListViews', () => {
  const mockClients = [
    generateWeddingTestData.client({
      id: 'client-1',
      first_name: 'John',
      last_name: 'Smith',
      partner_first_name: 'Jane',
      partner_last_name: 'Smith',
      email: 'john.jane@example.com',
      wedding_date: '2024-06-15',
      venue_name: 'Beautiful Wedding Venue',
      status: 'booked',
      package_name: 'Premium Package',
      package_price: 5000,
    }),
      id: 'client-2',
      first_name: 'Mike',
      last_name: 'Johnson',
      partner_first_name: 'Sarah',
      partner_last_name: 'Johnson',
      email: 'mike.sarah@example.com',
      wedding_date: '2024-08-22',
      venue_name: 'Garden Wedding Venue',
      status: 'lead',
      package_name: 'Standard Package',
      package_price: 3000,
  ]
  const defaultProps = {
    clients: mockClients,
    totalCount: mockClients.length,
    loading: false,
    onClientSelect: vi.fn(),
    onViewChange: vi.fn(),
    onSearch: vi.fn(),
    onFilter: vi.fn(),
    onSort: vi.fn(),
  }
  beforeEach(() => {
    vi.clearAllMocks()
  })
  describe('Rendering', () => {
    it('renders client list with all required elements', () => {
      render(<ClientListViews {...defaultProps} />)
      // Check for main interface elements
      expect(screen.getByRole('searchbox', { name: /search clients/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add new client/i })).toBeInTheDocument()
      expect(screen.getByText('John & Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Mike & Sarah Johnson')).toBeInTheDocument()
    })
    it('displays wedding-specific client information', () => {
      // Verify wedding-specific data is displayed
      expect(screen.getByText('Beautiful Wedding Venue')).toBeInTheDocument()
      expect(screen.getByText('Garden Wedding Venue')).toBeInTheDocument()
      expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument()
      expect(screen.getByText('Aug 22, 2024')).toBeInTheDocument()
      expect(screen.getByText('Premium Package')).toBeInTheDocument()
      expect(screen.getByText('Standard Package')).toBeInTheDocument()
    it('shows loading state correctly', () => {
      render(<ClientListViews {...defaultProps} loading={true} />)
      expect(screen.getByTestId('client-list-loading')).toBeInTheDocument()
    it('displays empty state when no clients', () => {
      render(<ClientListViews {...defaultProps} clients={[]} />)
      expect(screen.getByText(/no clients found/i)).toBeInTheDocument()
      expect(screen.getByText(/add your first wedding client/i)).toBeInTheDocument()
  describe('Search Functionality', () => {
    it('calls onSearch when search input changes', async () => {
      const onSearch = vi.fn()
      render(<ClientListViews {...defaultProps} onSearch={onSearch} />)
      const searchInput = screen.getByRole('searchbox', { name: /search clients/i })
      fireEvent.change(searchInput, { target: { value: 'John' } })
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('John')
      })
    it('clears search when clear button is clicked', async () => {
      
      const clearButton = screen.getByRole('button', { name: /clear search/i })
      fireEvent.click(clearButton)
        expect(onSearch).toHaveBeenCalledWith('')
        expect(searchInput).toHaveValue('')
    it('shows search results count when searching', () => {
      render(
        <ClientListViews 
          {...defaultProps} 
          searchQuery="John"
          totalCount={1}
        />
      )
      expect(screen.getByText(/1 result found/i)).toBeInTheDocument()
  describe('View Switching', () => {
    it('switches between list and grid views', () => {
      const onViewChange = vi.fn()
      render(<ClientListViews {...defaultProps} onViewChange={onViewChange} />)
      const gridViewButton = screen.getByRole('button', { name: /grid view/i })
      fireEvent.click(gridViewButton)
      expect(onViewChange).toHaveBeenCalledWith('grid')
    it('shows active view state correctly', () => {
      render(<ClientListViews {...defaultProps} currentView="grid" />)
      expect(gridViewButton).toHaveClass('bg-primary')
    it('renders calendar view for wedding date planning', () => {
      const calendarViewButton = screen.getByRole('button', { name: /calendar view/i })
      fireEvent.click(calendarViewButton)
      expect(onViewChange).toHaveBeenCalledWith('calendar')
    it('renders kanban view for wedding status tracking', () => {
      const kanbanViewButton = screen.getByRole('button', { name: /kanban view/i })
      fireEvent.click(kanbanViewButton)
      expect(onViewChange).toHaveBeenCalledWith('kanban')
  describe('Filtering', () => {
    it('filters by wedding status', async () => {
      const onFilter = vi.fn()
      render(<ClientListViews {...defaultProps} onFilter={onFilter} />)
      const statusFilter = screen.getByRole('combobox', { name: /filter by status/i })
      fireEvent.change(statusFilter, { target: { value: 'booked' } })
        expect(onFilter).toHaveBeenCalledWith({ status: 'booked' })
    it('filters by wedding date range', async () => {
      const dateFromInput = screen.getByLabelText(/wedding date from/i)
      const dateToInput = screen.getByLabelText(/wedding date to/i)
      fireEvent.change(dateFromInput, { target: { value: '2024-01-01' } })
      fireEvent.change(dateToInput, { target: { value: '2024-12-31' } })
        expect(onFilter).toHaveBeenCalledWith({
          wedding_date_from: '2024-01-01',
          wedding_date_to: '2024-12-31',
        })
    it('shows applied filter chips', () => {
          appliedFilters={{ status: 'booked', venue: 'Beautiful' }}
      expect(screen.getByText('Status: booked')).toBeInTheDocument()
      expect(screen.getByText('Venue: Beautiful')).toBeInTheDocument()
    it('removes filter when chip is clicked', async () => {
          onFilter={onFilter}
          appliedFilters={{ status: 'booked' }}
      const filterChip = screen.getByRole('button', { name: /remove status filter/i })
      fireEvent.click(filterChip)
        expect(onFilter).toHaveBeenCalledWith({ status: null })
  describe('Sorting', () => {
    it('sorts by wedding date', async () => {
      const onSort = vi.fn()
      render(<ClientListViews {...defaultProps} onSort={onSort} />)
      const sortButton = screen.getByRole('button', { name: /sort by wedding date/i })
      fireEvent.click(sortButton)
        expect(onSort).toHaveBeenCalledWith({ field: 'wedding_date', direction: 'asc' })
    it('toggles sort direction on repeated clicks', async () => {
          onSort={onSort} 
          sortBy={{ field: 'wedding_date', direction: 'asc' }}
        expect(onSort).toHaveBeenCalledWith({ field: 'wedding_date', direction: 'desc' })
    it('sorts by client name alphabetically', async () => {
      const sortButton = screen.getByRole('button', { name: /sort by name/i })
        expect(onSort).toHaveBeenCalledWith({ field: 'name', direction: 'asc' })
    it('shows sort indicator for active sort', () => {
      expect(sortButton).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('sort-asc-icon')).toBeInTheDocument()
  describe('Client Actions', () => {
    it('calls onClientSelect when client is clicked', async () => {
      const onClientSelect = vi.fn()
      render(<ClientListViews {...defaultProps} onClientSelect={onClientSelect} />)
      const clientCard = screen.getByText('John & Jane Smith').closest('div')
      fireEvent.click(clientCard!)
        expect(onClientSelect).toHaveBeenCalledWith('client-1')
    it('shows client action menu', async () => {
      const actionButton = screen.getAllByRole('button', { name: /client actions/i })[0]
      fireEvent.click(actionButton)
        expect(screen.getByText('Edit Client')).toBeInTheDocument()
        expect(screen.getByText('Send Email')).toBeInTheDocument()
        expect(screen.getByText('Schedule Meeting')).toBeInTheDocument()
        expect(screen.getByText('Archive Client')).toBeInTheDocument()
    it('handles wedding-specific actions', async () => {
        expect(screen.getByText('View Wedding Timeline')).toBeInTheDocument()
        expect(screen.getByText('Manage Guest List')).toBeInTheDocument()
        expect(screen.getByText('Send Wedding Survey')).toBeInTheDocument()
  describe('Bulk Operations', () => {
    it('shows bulk selection interface when clients are selected', () => {
          selectedClients={['client-1', 'client-2']}
      expect(screen.getByText('2 clients selected')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk actions/i })).toBeInTheDocument()
    it('allows bulk email sending to wedding couples', async () => {
      const bulkActionsButton = screen.getByRole('button', { name: /bulk actions/i })
      fireEvent.click(bulkActionsButton)
        expect(screen.getByText('Send Wedding Update Email')).toBeInTheDocument()
        expect(screen.getByText('Send Payment Reminder')).toBeInTheDocument()
        expect(screen.getByText('Send Timeline Update')).toBeInTheDocument()
  describe('Wedding-Specific Features', () => {
    it('displays wedding countdown for upcoming weddings', () => {
      const upcomingClient = generateWeddingTestData.client({
        id: 'upcoming-client',
        wedding_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      render(<ClientListViews {...defaultProps} clients={[upcomingClient]} />)
      expect(screen.getByText(/30 days until wedding/i)).toBeInTheDocument()
    it('shows overdue payment indicators', () => {
      const overdueClient = generateWeddingTestData.client({
        id: 'overdue-client',
        payment_status: 'overdue',
        balance_due: 2500,
      render(<ClientListViews {...defaultProps} clients={[overdueClient]} />)
      expect(screen.getByText(/payment overdue/i)).toBeInTheDocument()
      expect(screen.getByText('$2,500')).toBeInTheDocument()
    it('displays WedMe integration status', () => {
      const connectedClient = generateWeddingTestData.client({
        id: 'connected-client',
        is_wedme_connected: true,
      const disconnectedClient = generateWeddingTestData.client({
        id: 'disconnected-client',
        is_wedme_connected: false,
      render(<ClientListViews {...defaultProps} clients={[connectedClient, disconnectedClient]} />)
      expect(screen.getByTestId('wedme-connected-client-1')).toBeInTheDocument()
      expect(screen.getByTestId('wedme-disconnected-client-2')).toBeInTheDocument()
    it('shows wedding progress indicators', () => {
      const clientWithProgress = generateWeddingTestData.client({
        id: 'progress-client',
        wedding_progress: 75,
        completed_tasks: 12,
        total_tasks: 16,
      render(<ClientListViews {...defaultProps} clients={[clientWithProgress]} />)
      expect(screen.getByText('75% Complete')).toBeInTheDocument()
      expect(screen.getByText('12/16 tasks done')).toBeInTheDocument()
  describe('Performance', () => {
    it('renders large client lists efficiently', async () => {
      const largeClientList = Array.from({ length: 1000 }, (_, index) => 
        generateWeddingTestData.client({
          id: `client-${index}`,
          first_name: `Client${index}`,
          last_name: 'Smith',
      const start = performance.now()
      render(<ClientListViews {...defaultProps} clients={largeClientList} />)
      const end = performance.now()
      // Should render within reasonable time (under 1 second)
      expect(end - start).toBeLessThan(1000)
    it('implements virtual scrolling for large lists', () => {
        generateWeddingTestData.client({ id: `client-${index}` })
      // Check that virtual scrolling container is present
      expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument()
  describe('Accessibility', () => {
    it('has proper ARIA labels for wedding context', () => {
      expect(screen.getByRole('search', { name: /search wedding clients/i })).toBeInTheDocument()
      expect(screen.getByRole('main', { name: /wedding client list/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add new wedding client/i })).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      const firstClient = screen.getByText('John & Jane Smith')
      firstClient.focus()
      fireEvent.keyDown(firstClient, { key: 'ArrowDown' })
        expect(screen.getByText('Mike & Sarah Johnson')).toHaveFocus()
      fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
        expect(defaultProps.onClientSelect).toHaveBeenCalledWith('client-2')
    it('announces wedding status changes to screen readers', async () => {
      const { rerender } = render(<ClientListViews {...defaultProps} />)
      const updatedClients = [
        { ...mockClients[0], status: 'completed' as const },
        mockClients[1],
      ]
      rerender(<ClientListViews {...defaultProps} clients={updatedClients} />)
        expect(screen.getByRole('status')).toHaveTextContent(
          'Client status updated to completed'
        )
  describe('Error Handling', () => {
    it('handles client data validation errors gracefully', () => {
      const invalidClient = {
        id: 'invalid-client',
        first_name: '',
        last_name: '',
        email: 'invalid-email',
        wedding_date: 'invalid-date',
      }
      expect(() => {
        render(<ClientListViews {...defaultProps} clients={[invalidClient as any]} />)
      }).not.toThrow()
      expect(screen.getByText(/invalid client data/i)).toBeInTheDocument()
    it('shows error boundary for component crashes', () => {
      const ErrorThrowingComponent = () => {
        throw new Error('Test error')
          renderClient={() => <ErrorThrowingComponent />}
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reload clients/i })).toBeInTheDocument()
  describe('Data Validation', () => {
    it('validates wedding client data structure', () => {
      mockClients.forEach(client => {
        expectWeddingData.toBeValidClient(client)
    it('handles missing wedding dates gracefully', () => {
      const clientWithoutDate = generateWeddingTestData.client({
        wedding_date: null,
      render(<ClientListViews {...defaultProps} clients={[clientWithoutDate]} />)
      expect(screen.getByText('Date TBD')).toBeInTheDocument()
    it('validates email formats for wedding couples', () => {
      const clientWithInvalidEmail = generateWeddingTestData.client({
      render(<ClientListViews {...defaultProps} clients={[clientWithInvalidEmail]} />)
      expect(screen.getByTestId('invalid-email-warning')).toBeInTheDocument()
})
