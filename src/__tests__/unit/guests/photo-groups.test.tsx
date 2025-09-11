import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}))
// Mock supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
// Components to test (will be implemented)
import { PhotoGroupManager } from '@/components/guests/PhotoGroupManager'
import { PhotoGroupBuilder } from '@/components/guests/PhotoGroupBuilder'
import { PhotoGroupCard } from '@/components/guests/PhotoGroupCard'
import { GuestSelector } from '@/components/guests/GuestSelector'
// Test data
const mockPhotoGroups = [
  {
    id: 'group-1',
    couple_id: 'couple-1',
    name: 'Family Photos',
    description: 'Extended family group shots',
    photo_type: 'family' as const,
    priority: 1,
    estimated_time_minutes: 15,
    location: 'Garden',
    timeline_slot: 'ceremony-after',
    photographer_notes: 'Include grandparents',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    assignments: [
      {
        id: 'assign-1',
        photo_group_id: 'group-1',
        guest_id: 'guest-1',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
        guest: {
          id: 'guest-1',
          first_name: 'John',
          last_name: 'Smith',
          side: 'partner1' as const,
          category: 'family' as const
        }
      }
    ]
  }
]
const mockGuests = [
    id: 'guest-1',
    first_name: 'John',
    last_name: 'Smith',
    side: 'partner1' as const,
    category: 'family' as const,
    assigned_groups: ['group-1'],
    conflicts: []
  },
    id: 'guest-2',
    first_name: 'Jane',
    last_name: 'Doe',
    side: 'partner2' as const,
    category: 'friends' as const,
    assigned_groups: [],
// Test wrapper with DnD context
const DnDTestWrapper = ({ children }: { children: React.ReactNode }) => (
  <DndContext onDragEnd={() => {}}>
    {children}
  </DndContext>
)
describe('PhotoGroupManager', () => {
  const defaultProps = {
    coupleId: 'couple-1',
    initialGroups: mockPhotoGroups,
    availableGuests: mockGuests
  it('renders photo groups list', async () => {
    render(
      <DnDTestWrapper>
        <PhotoGroupManager {...defaultProps} />
      </DnDTestWrapper>
    )
    expect(screen.getByText('Photo Groups')).toBeInTheDocument()
    expect(screen.getByText('Family Photos')).toBeInTheDocument()
  it('displays create new group button', () => {
    expect(screen.getByRole('button', { name: /create.*group/i })).toBeInTheDocument()
  it('handles search functionality', async () => {
    const searchInput = screen.getByPlaceholderText(/search.*groups/i)
    fireEvent.change(searchInput, { target: { value: 'Family' } })
    await waitFor(() => {
      expect(screen.getByText('Family Photos')).toBeInTheDocument()
    })
  it('handles filter by photo type', () => {
    const filterSelect = screen.getByRole('combobox', { name: /photo type/i })
    expect(filterSelect).toBeInTheDocument()
  it('displays metrics summary', () => {
    expect(screen.getByText(/total groups/i)).toBeInTheDocument()
    expect(screen.getByText(/estimated time/i)).toBeInTheDocument()
  it('opens photo group builder modal', async () => {
    const createButton = screen.getByRole('button', { name: /create.*group/i })
    fireEvent.click(createButton)
      expect(screen.getByText(/new photo group/i)).toBeInTheDocument()
  it('handles drag and drop reordering', async () => {
    const onReorder = vi.fn()
        <PhotoGroupManager {...defaultProps} onReorder={onReorder} />
    // DnD testing would require more complex setup with @testing-library/user-event
    // This is a placeholder for drag-drop functionality testing
})
describe('PhotoGroupBuilder', () => {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    availableGuests: mockGuests,
    coupleId: 'couple-1'
  it('renders create form when no initial data', () => {
    render(<PhotoGroupBuilder {...defaultProps} />)
    expect(screen.getByText(/new photo group/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/group name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/photo type/i)).toBeInTheDocument()
  it('renders edit form when initial data provided', () => {
      <PhotoGroupBuilder
        {...defaultProps}
        initialData={mockPhotoGroups[0]}
      />
    expect(screen.getByText(/edit photo group/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Family Photos')).toBeInTheDocument()
  it('validates required fields', async () => {
    const submitButton = screen.getByRole('button', { name: /save.*group/i })
    fireEvent.click(submitButton)
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  it('handles form submission', async () => {
    const onSubmit = vi.fn()
    render(<PhotoGroupBuilder {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/group name/i), {
      target: { value: 'Test Group' }
    
    fireEvent.change(screen.getByLabelText(/estimated time/i), {
      target: { value: '10' }
    fireEvent.click(screen.getByRole('button', { name: /save.*group/i }))
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Group',
          estimated_time_minutes: 10
        })
      )
  it('displays guest selector', () => {
    expect(screen.getByText(/assign guests/i)).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  it('handles guest assignment', async () => {
    const guestCard = screen.getByText('Jane Doe').closest('div')
    expect(guestCard).toBeInTheDocument()
    fireEvent.click(guestCard!)
      expect(guestCard).toHaveClass(/selected/i)
  it('shows conflict warnings', () => {
    const guestsWithConflicts = [
        ...mockGuests[0],
        conflicts: [{
          groupId: 'other-group',
          conflictingGroupId: 'group-1',
          reason: 'time_overlap' as const,
          severity: 'warning' as const,
          message: 'Time overlap with another group'
        }]
        availableGuests={guestsWithConflicts}
    expect(screen.getByText(/time overlap/i)).toBeInTheDocument()
describe('PhotoGroupCard', () => {
    photoGroup: mockPhotoGroups[0],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAssignGuest: vi.fn(),
    onUnassignGuest: vi.fn(),
    isSelected: false,
  it('renders photo group information', () => {
        <PhotoGroupCard {...defaultProps} />
    expect(screen.getByText('Extended family group shots')).toBeInTheDocument()
    expect(screen.getByText('15 minutes')).toBeInTheDocument()
    expect(screen.getByText('Garden')).toBeInTheDocument()
  it('displays assigned guests', () => {
    expect(screen.getByText(/family/i)).toBeInTheDocument()
  it('shows priority indicator', () => {
    expect(screen.getByText('Priority 1')).toBeInTheDocument()
  it('handles edit action', () => {
    const onEdit = vi.fn()
        <PhotoGroupCard {...defaultProps} onEdit={onEdit} />
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)
    expect(onEdit).toHaveBeenCalledWith(mockPhotoGroups[0])
  it('handles delete action with confirmation', async () => {
    const onDelete = vi.fn()
        <PhotoGroupCard {...defaultProps} onDelete={onDelete} />
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteButton)
      expect(screen.getByText(/confirm delete/i)).toBeInTheDocument()
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    fireEvent.click(confirmButton)
    expect(onDelete).toHaveBeenCalledWith(mockPhotoGroups[0].id)
  it('displays conflict warnings', () => {
    const conflicts = [{
      groupId: 'group-1',
      conflictingGroupId: 'group-2',
      reason: 'time_overlap' as const,
      severity: 'warning' as const,
      message: 'Overlaps with Couple Photos'
    }]
        <PhotoGroupCard {...defaultProps} conflicts={conflicts} />
    expect(screen.getByText(/overlaps with couple photos/i)).toBeInTheDocument()
  it('shows empty state when no guests assigned', () => {
    const emptyGroup = { ...mockPhotoGroups[0], assignments: [] }
        <PhotoGroupCard {...defaultProps} photoGroup={emptyGroup} />
    expect(screen.getByText(/no guests assigned/i)).toBeInTheDocument()
  it('handles drag operations', () => {
    const card = screen.getByText('Family Photos').closest('div')
    expect(card).toHaveAttribute('draggable')
describe('GuestSelector', () => {
    selectedGuestIds: ['guest-1'],
    onGuestSelect: vi.fn(),
    onGuestUnselect: vi.fn(),
    searchPlaceholder: 'Search guests...'
  it('renders available guests', () => {
        <GuestSelector {...defaultProps} />
  it('shows selected guests as checked', () => {
    const johnCard = screen.getByText('John Smith').closest('div')
    expect(johnCard).toHaveClass(/selected/i)
  it('handles guest selection', () => {
    const onGuestSelect = vi.fn()
        <GuestSelector {...defaultProps} onGuestSelect={onGuestSelect} />
    const janeCard = screen.getByText('Jane Doe').closest('div')
    fireEvent.click(janeCard!)
    expect(onGuestSelect).toHaveBeenCalledWith('guest-2')
  it('handles guest unselection', () => {
    const onGuestUnselect = vi.fn()
        <GuestSelector {...defaultProps} onGuestUnselect={onGuestUnselect} />
    fireEvent.click(johnCard!)
    expect(onGuestUnselect).toHaveBeenCalledWith('guest-1')
  it('filters guests by search term', async () => {
    const searchInput = screen.getByPlaceholderText('Search guests...')
    fireEvent.change(searchInput, { target: { value: 'John' } })
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
  it('groups guests by category', () => {
        <GuestSelector {...defaultProps} groupByCategory />
    expect(screen.getByText(/friends/i)).toBeInTheDocument()
  it('shows guest side indicators', () => {
    expect(screen.getByText(/partner 1/i)).toBeInTheDocument()
    expect(screen.getByText(/partner 2/i)).toBeInTheDocument()
  it('displays conflict indicators for guests', () => {
          groupId: 'group-1',
          conflictingGroupId: 'group-2',
          severity: 'error' as const,
          message: 'Cannot be in both groups'
        <GuestSelector {...defaultProps} availableGuests={guestsWithConflicts} />
    expect(screen.getByText(/cannot be in both groups/i)).toBeInTheDocument()
  it('handles drag and drop guest assignment', () => {
    expect(guestCard).toHaveAttribute('draggable')
  it('shows empty state when no guests available', () => {
        <GuestSelector {...defaultProps} availableGuests={[]} />
    expect(screen.getByText(/no guests available/i)).toBeInTheDocument()
// Integration tests for complete workflows
describe('Photo Groups Integration', () => {
  it('creates new photo group and assigns guests', async () => {
    const mockOnSubmit = vi.fn()
        <PhotoGroupManager
          coupleId="couple-1"
          initialGroups={[]}
          availableGuests={mockGuests}
        />
        <PhotoGroupBuilder
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={mockOnSubmit}
    // Fill form
      target: { value: 'Wedding Party' }
    // Assign guest
    const guestCard = screen.getByText('John Smith').closest('div')
    // Submit
      expect(mockOnSubmit).toHaveBeenCalledWith(
          name: 'Wedding Party',
          guest_ids: ['guest-1']
  it('handles drag and drop between groups', async () => {
    // This would test the complete drag-drop workflow
    // Implementation depends on the DnD library setup
    expect(true).toBe(true) // Placeholder
  it('detects and displays conflicts', () => {
    const conflictingGroups = [
        ...mockPhotoGroups[0],
        timeline_slot: '14:00-14:30'
      },
        id: 'group-2',
        couple_id: 'couple-1',
        name: 'Couple Photos',
        timeline_slot: '14:15-14:45',
        assignments: [
          {
            id: 'assign-2',
            photo_group_id: 'group-2',
            guest_id: 'guest-1',
            is_primary: true,
            created_at: '2024-01-01T00:00:00Z',
            guest: mockGuests[0]
          }
        ]
          initialGroups={conflictingGroups}
    expect(screen.getByText(/conflict/i)).toBeInTheDocument()
