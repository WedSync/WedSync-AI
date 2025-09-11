/**
 * PhotoGroupScheduler Component Tests - Team A Round 2 WS-153
 * Enhanced unit tests for advanced scheduling functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PhotoGroupScheduler } from '@/components/guests/PhotoGroupScheduler'
import { usePhotoGroupSchedulingRealtime } from '@/hooks/useSupabaseRealtime'
import { PhotoGroup } from '@/types/photo-groups'
// Mock the realtime hook
jest.mock('@/hooks/useSupabaseRealtime', () => ({
  usePhotoGroupSchedulingRealtime: jest.fn()
}))
const mockUseRealtime = usePhotoGroupSchedulingRealtime as jest.MockedFunction<typeof usePhotoGroupSchedulingRealtime>
describe('PhotoGroupScheduler', () => {
  const mockPhotoGroup: PhotoGroup = {
    id: 'group-1',
    couple_id: 'couple-1',
    name: 'Family Photos',
    description: 'Immediate family group photos',
    photo_type: 'family',
    priority: 1,
    estimated_time_minutes: 30,
    location: 'Garden Area',
    timeline_slot: 'ceremony_after',
    photographer_notes: 'Focus on grandparents',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    assignments: []
  }
  const mockTimeSlots = [
    {
      id: 'slot-1',
      start_time: '2024-01-15T14:00:00Z',
      end_time: '2024-01-15T14:30:00Z',
      duration_minutes: 30,
      location: 'Garden Area',
      is_available: true,
      conflicts: [],
      assigned_group_id: undefined
    },
      id: 'slot-2',
      start_time: '2024-01-15T14:30:00Z',
      end_time: '2024-01-15T15:00:00Z',
      conflicts: ['guest-overlap'],
      id: 'slot-3',
      start_time: '2024-01-15T15:00:00Z',
      end_time: '2024-01-15T15:30:00Z',
      location: 'Chapel',
      is_available: false,
      assigned_group_id: 'other-group'
    }
  ]
  const mockOnScheduleUpdate = jest.fn()
  const mockOnConflictResolution = jest.fn()
  const mockSend = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRealtime.mockReturnValue({
      send: mockSend,
      isConnected: true
    })
  })
  describe('Basic Rendering', () => {
    it('renders scheduler with photo group information', () => {
      render(
        <PhotoGroupScheduler
          photoGroup={mockPhotoGroup}
          availableTimeSlots={mockTimeSlots}
          onScheduleUpdate={mockOnScheduleUpdate}
          onConflictResolution={mockOnConflictResolution}
        />
      )
      expect(screen.getByText('Schedule: Family Photos')).toBeInTheDocument()
      expect(screen.getByText('Duration: 30 minutes')).toBeInTheDocument()
      expect(screen.getByText('Garden Area')).toBeInTheDocument()
    it('displays available time slots correctly', () => {
      // Should show available slots
      expect(screen.getByText('2:00 PM - 2:30 PM')).toBeInTheDocument()
      expect(screen.getByText('2:30 PM - 3:00 PM')).toBeInTheDocument()
      
      // Should indicate unavailable slot
      const unavailableSlot = screen.getByText('3:00 PM - 3:30 PM')
      expect(unavailableSlot.closest('button')).toBeDisabled()
    it('groups time slots by day correctly', () => {
      const multiDaySlots = [
        ...mockTimeSlots,
        {
          id: 'slot-4',
          start_time: '2024-01-16T14:00:00Z',
          end_time: '2024-01-16T14:30:00Z',
          duration_minutes: 30,
          is_available: true,
          conflicts: []
        }
      ]
          availableTimeSlots={multiDaySlots}
      expect(screen.getByText(/Monday, January 15/)).toBeInTheDocument()
      expect(screen.getByText(/Tuesday, January 16/)).toBeInTheDocument()
  describe('Time Slot Selection', () => {
    it('allows selecting an available time slot', async () => {
      const user = userEvent.setup()
      const availableSlot = screen.getByText('2:00 PM - 2:30 PM').closest('button')
      await user.click(availableSlot!)
      // Should show selected slot in footer
      expect(screen.getByText(/Selected: 2:00 PM - 2:30 PM/)).toBeInTheDocument()
    it('prevents selecting unavailable time slots', async () => {
      const unavailableSlot = screen.getByText('3:00 PM - 3:30 PM').closest('button')
      expect(unavailableSlot).toBeDisabled()
    it('shows conflict warnings for problematic slots', () => {
      const conflictSlot = screen.getByText('2:30 PM - 3:00 PM').closest('button')
      const conflictIndicator = within(conflictSlot!).getByText('1 conflict')
      expect(conflictIndicator).toBeInTheDocument()
  describe('Conflict Detection', () => {
    it('detects and displays guest overlap conflicts', async () => {
      // Select slot with conflicts
      await user.click(conflictSlot!)
      await waitFor(() => {
        expect(screen.getByText(/guests are scheduled in overlapping sessions/)).toBeInTheDocument()
      })
    it('prevents scheduling when critical conflicts exist', async () => {
      // Select conflicting slot
        const confirmButton = screen.getByText('Confirm Schedule')
        expect(confirmButton).toBeDisabled()
    it('allows scheduling when only warnings exist', async () => {
      // Mock a slot with warnings only
      const slotsWithWarnings = [
          ...mockTimeSlots[0],
          availableTimeSlots={slotsWithWarnings}
        expect(confirmButton).not.toBeDisabled()
  describe('Schedule Confirmation', () => {
    it('calls onScheduleUpdate when confirming schedule', async () => {
          availableTimeSlots={[mockTimeSlots[0]]} // Only available slots
      // Select and confirm slot
      const confirmButton = screen.getByText('Confirm Schedule')
      await user.click(confirmButton)
      expect(mockOnScheduleUpdate).toHaveBeenCalledWith(mockPhotoGroup.id, 'slot-1')
    it('broadcasts real-time update after successful scheduling', async () => {
      mockOnScheduleUpdate.mockResolvedValue(undefined)
          availableTimeSlots={[mockTimeSlots[0]]}
        expect(mockSend).toHaveBeenCalledWith('schedule_updated', expect.objectContaining({
          group_id: mockPhotoGroup.id,
          time_slot_id: 'slot-1',
          group_name: mockPhotoGroup.name
        }))
    it('shows loading state during scheduling', async () => {
      mockOnScheduleUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      expect(screen.getByText('Scheduling...')).toBeInTheDocument()
  describe('View Mode Toggle', () => {
    it('toggles between timeline and calendar view', async () => {
      const toggleButton = screen.getByText('Calendar View')
      await user.click(toggleButton)
      expect(screen.getByText('Calendar view coming soon')).toBeInTheDocument()
      expect(screen.getByText('Timeline View')).toBeInTheDocument()
  describe('Real-time Integration', () => {
    it('initializes real-time connection for the couple', () => {
      expect(mockUseRealtime).toHaveBeenCalledWith(mockPhotoGroup.couple_id, true)
    it('handles disconnected real-time state gracefully', async () => {
      mockUseRealtime.mockReturnValue({
        send: mockSend,
        isConnected: false
      // Should not attempt to send when disconnected
      expect(mockSend).not.toHaveBeenCalled()
  describe('Readonly Mode', () => {
    it('disables all interactions in readonly mode', () => {
          readonly={true}
      const timeSlots = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('PM')
      timeSlots.forEach(slot => {
        expect(slot).toBeDisabled()
    it('hides footer actions in readonly mode', () => {
      expect(screen.queryByText('Confirm Schedule')).not.toBeInTheDocument()
  describe('Empty State', () => {
    it('shows empty state when no time slots are available', () => {
          availableTimeSlots={[]}
      expect(screen.getByText('No time slots available')).toBeInTheDocument()
      expect(screen.getByText(/Contact your photographer/)).toBeInTheDocument()
  describe('Accessibility', () => {
    it('provides proper ARIA labels for time slots', () => {
      const timeSlotButtons = screen.getAllByRole('button').filter(btn => 
      expect(timeSlotButtons.length).toBeGreaterThan(0)
    it('supports keyboard navigation', async () => {
      const firstTimeSlot = screen.getByText('2:00 PM - 2:30 PM').closest('button')
      firstTimeSlot?.focus()
      await user.keyboard('{Enter}')
  describe('Error Handling', () => {
    it('handles scheduling errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockOnScheduleUpdate.mockRejectedValue(new Error('Scheduling failed'))
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update schedule:', expect.any(Error))
        expect(screen.getByText('Confirm Schedule')).not.toBeDisabled()
      consoleSpy.mockRestore()
})
