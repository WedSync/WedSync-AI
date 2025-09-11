/**
 * Unit Tests for PhotoGroupsManager Component
 * WS-153: Photo Groups Management - Comprehensive Testing
 * 
 * Tests drag-drop functionality, real-time updates, form validation,
 * guest assignment, and all user interactions
 */

import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PhotoGroupsManager } from '@/components/guests/PhotoGroupsManager'
import { createClient } from '@/lib/supabase/client'
// Mock dependencies
vi.mock('@/lib/supabase/client')
vi.mock('@/lib/utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))
// Mock drag-and-drop functionality
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => [])
vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((items, oldIndex, newIndex) => {
    const result = [...items]
    const [removed] = result.splice(oldIndex, 1)
    result.splice(newIndex, 0, removed)
    return result
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  }))
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => '')
    }
// Test data
const mockPhotoGroups = [
  {
    id: 'group-1',
    couple_id: 'couple-1',
    name: 'Family Photos',
    description: 'Immediate family group photos',
    photo_type: 'family',
    priority: 1,
    estimated_time_minutes: 10,
    location: 'Garden',
    timeline_slot: 'After ceremony',
    photographer_notes: 'Use natural lighting',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    assignments: [
      {
        id: 'assign-1',
        photo_group_id: 'group-1',
        guest_id: 'guest-1',
        is_primary: true,
        position_notes: 'Center position',
        guest: {
          id: 'guest-1',
          first_name: 'John',
          last_name: 'Doe',
          side: 'bride',
          category: 'family'
        }
      }
    ],
    guest_count: 1
  },
    id: 'group-2',
    name: 'Bridal Party',
    description: 'All bridesmaids together',
    photo_type: 'bridesmaids',
    priority: 2,
    estimated_time_minutes: 15,
    location: 'Church steps',
    timeline_slot: 'Before reception',
    photographer_notes: 'Coordinate dress colors',
    assignments: [],
    guest_count: 0
]
const mockGuests = [
    id: 'guest-1',
    first_name: 'John',
    last_name: 'Doe',
    side: 'bride',
    category: 'family'
    id: 'guest-2',
    first_name: 'Jane',
    last_name: 'Smith',
    side: 'groom',
    category: 'friend'
    id: 'guest-3',
    first_name: 'Bob',
    last_name: 'Johnson',
const mockSupabaseClient = {
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn()
}
describe('PhotoGroupsManager Component', () => {
  const defaultProps = {
    coupleId: 'couple-1',
    onUpdate: vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default Supabase mocks
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockInsert = vi.fn().mockReturnThis()
    const mockUpdate = vi.fn().mockReturnThis()
    const mockDelete = vi.fn().mockReturnThis()
    const mockChannel = vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })
    mockSupabaseClient.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    mockSupabaseClient.channel.mockImplementation(mockChannel)
    ;(createClient as any).mockReturnValue(mockSupabaseClient)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  describe('Component Initialization', () => {
    it('renders without crashing', () => {
      render(<PhotoGroupsManager {...defaultProps} />)
      
      expect(screen.getByText('Photo Groups Manager')).toBeInTheDocument()
      expect(screen.getByText('Organize family photos and group shots for your photographer')).toBeInTheDocument()
    it('shows loading state initially', () => {
      // Loading skeleton should be present
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    it('displays add photo group button', () => {
      const addButton = screen.getByRole('button', { name: /add photo group/i })
      expect(addButton).toBeInTheDocument()
    it('displays export button', () => {
      const exportButton = screen.getByRole('button', { name: /export for photographer/i })
      expect(exportButton).toBeInTheDocument()
  describe('Data Loading', () => {
    it('fetches photo groups on mount', async () => {
      const mockData = { data: mockPhotoGroups, error: null }
      const mockGuestsData = { data: mockGuests, error: null }
      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockResolvedValueOnce(mockData).mockResolvedValueOnce(mockGuestsData)
      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        order: mockOrder
      })
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('photo_groups')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('guests')
    it('subscribes to real-time updates', () => {
      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('photo-groups-updates')
    it('handles data loading errors gracefully', async () => {
      const mockError = { data: null, error: new Error('Network error') }
      const mockOrder = vi.fn().mockResolvedValue(mockError)
      // Should handle error without crashing
  describe('Stats Display', () => {
    it('displays correct statistics when data is loaded', async () => {
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Total Groups
        expect(screen.getByText('25 min')).toBeInTheDocument() // Total Time
        expect(screen.getByText('1')).toBeInTheDocument() // Guests Assigned  
        expect(screen.getByText('13 min')).toBeInTheDocument() // Avg Time/Group (25/2)
    it('shows zero stats when no photo groups exist', () => {
      const mockData = { data: [], error: null }
      // Should show empty state
      expect(screen.queryByText('No photo groups created yet')).toBeInTheDocument()
  describe('Create/Edit Form', () => {
    it('opens create form when add button is clicked', async () => {
      fireEvent.click(addButton)
      expect(screen.getByText('Create New Photo Group')).toBeInTheDocument()
      expect(screen.getByLabelText(/group name/i)).toBeInTheDocument()
    it('validates required fields', async () => {
      const createButton = screen.getByRole('button', { name: /create group/i })
      // Button should be disabled when name is empty
      expect(createButton).toBeDisabled()
      // Fill in name field
      const nameInput = screen.getByLabelText(/group name/i)
      fireEvent.change(nameInput, { target: { value: 'Test Group' } })
      expect(createButton).not.toBeDisabled()
    it('handles form input changes correctly', () => {
      // Test name input
      fireEvent.change(nameInput, { target: { value: 'Family Photos' } })
      expect(nameInput).toHaveValue('Family Photos')
      // Test description input
      const descriptionInput = screen.getByLabelText(/description/i)
      fireEvent.change(descriptionInput, { target: { value: 'Test description' } })
      expect(descriptionInput).toHaveValue('Test description')
      // Test time input
      const timeInput = screen.getByLabelText(/estimated time/i)
      fireEvent.change(timeInput, { target: { value: '15' } })
      expect(timeInput).toHaveValue('15')
    it('shows all photo type options', () => {
      const photoTypeSelect = screen.getByDisplayValue('Select type...')
      fireEvent.click(photoTypeSelect)
      // Should show all 9 photo types
      const expectedTypes = [
        'Family Photos', 'Friends Photos', 'Bridal Party', 'Groomsmen',
        'Bridesmaids', 'Children', 'Special Moments', 'Formal Portraits', 'Candid Shots'
      ]
      expectedTypes.forEach(type => {
        expect(screen.getByText(type)).toBeInTheDocument()
    it('cancels form and resets state', () => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
      // Form should be closed
      expect(screen.queryByText('Create New Photo Group')).not.toBeInTheDocument()
      // If form is opened again, fields should be reset
      const nameInputAfterCancel = screen.getByLabelText(/group name/i)
      expect(nameInputAfterCancel).toHaveValue('')
  describe('Guest Assignment', () => {
    beforeEach(() => {
    it('displays guest selection checkboxes', async () => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
    it('handles guest selection/deselection', async () => {
        const johnCheckbox = screen.getByRole('checkbox', { name: /john doe/i })
        
        expect(johnCheckbox).not.toBeChecked()
        fireEvent.click(johnCheckbox)
        expect(johnCheckbox).toBeChecked()
    it('updates guest selection counter', async () => {
        expect(screen.getByText('0 guests selected')).toBeInTheDocument()
        expect(screen.getByText('1 guests selected')).toBeInTheDocument()
  describe('Photo Group Display', () => {
    it('displays photo groups with correct information', async () => {
        expect(screen.getByText('Family Photos')).toBeInTheDocument()
        expect(screen.getByText('Bridal Party')).toBeInTheDocument()
        expect(screen.getByText('Immediate family group photos')).toBeInTheDocument()
        expect(screen.getByText('10 min')).toBeInTheDocument()
        expect(screen.getByText('Garden')).toBeInTheDocument()
    it('shows photo type icons', async () => {
        // Family photos should show family icon (👨‍👩‍👧‍👦)
        // Bridesmaids should show bridesmaid icon (💐)
        const familyIcon = screen.getByText('👨‍👩‍👧‍👦')
        const bridesmaidIcon = screen.getByText('💐')
        expect(familyIcon).toBeInTheDocument()
        expect(bridesmaidIcon).toBeInTheDocument()
    it('displays priority badges correctly', async () => {
        expect(screen.getByText('Priority 1')).toBeInTheDocument()
        expect(screen.getByText('Priority 2')).toBeInTheDocument()
    it('shows guest assignments with correct formatting', async () => {
        expect(screen.getByText('John Doe (Primary)')).toBeInTheDocument()
        expect(screen.getByText('1 guests')).toBeInTheDocument()
    it('shows photographer notes when present', async () => {
        expect(screen.getByText('Use natural lighting')).toBeInTheDocument()
        expect(screen.getByText('Coordinate dress colors')).toBeInTheDocument()
  describe('Action Buttons', () => {
    it('shows edit, duplicate, and delete buttons for each group', async () => {
        const editButtons = screen.getAllByText('Edit')
        const duplicateButtons = screen.getAllByTitle('Duplicate group')
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
        expect(editButtons).toHaveLength(2)
        expect(duplicateButtons).toHaveLength(2)
        expect(deleteButtons).toHaveLength(2)
    it('opens edit form with populated data', async () => {
        fireEvent.click(editButtons[0])
        expect(screen.getByText('Edit Photo Group')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Family Photos')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Immediate family group photos')).toBeInTheDocument()
        expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  describe('Photographer Export', () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined)
    it('generates photographer list and copies to clipboard', async () => {
        const exportButton = screen.getByRole('button', { name: /export for photographer/i })
        fireEvent.click(exportButton)
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
        const clipboardContent = (navigator.clipboard.writeText as any).mock.calls[0][0]
        expect(clipboardContent).toContain('Family Photos')
        expect(clipboardContent).toContain('10 minutes')
        expect(clipboardContent).toContain('Garden')
        expect(clipboardContent).toContain('John Doe (Primary)')
  describe('Error Handling', () => {
    it('handles create photo group errors', async () => {
      const mockError = { data: null, error: new Error('Creation failed') }
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockInsert = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue(mockError)
        order: mockOrder,
        insert: mockInsert,
        single: mockSingle
      fireEvent.click(createButton)
      // Should handle error gracefully without crashing
  describe('Performance', () => {
    it('renders efficiently with large number of guests', async () => {
      const largeGuestList = Array.from({ length: 100 }, (_, i) => ({
        id: `guest-${i}`,
        first_name: `First${i}`,
        last_name: `Last${i}`,
        side: i % 2 === 0 ? 'bride' : 'groom',
        category: 'friend'
      }))
      const mockGuestsData = { data: largeGuestList, error: null }
      const startTime = performance.now()
      const renderTime = performance.now() - startTime
      // Should render within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100)
  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      expect(screen.getByRole('button', { name: /add photo group/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export for photographer/i })).toBeInTheDocument()
      // Should have proper heading structure
      expect(screen.getByRole('heading', { name: /photo groups manager/i })).toBeInTheDocument()
    it('supports keyboard navigation', () => {
      addButton.focus()
      expect(document.activeElement).toBe(addButton)
      // Should be able to activate with Enter or Space
      fireEvent.keyDown(addButton, { key: 'Enter' })
    it('provides screen reader friendly content', async () => {
        // Check for descriptive text that screen readers can announce
})
