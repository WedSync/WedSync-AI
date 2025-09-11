/**
 * ConflictDetectionPanel Component Tests - Team A Round 2 WS-153
 * Enhanced unit tests for advanced conflict detection and resolution
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ConflictDetectionPanel } from '@/components/guests/ConflictDetectionPanel'
import { photoGroupsApiService } from '@/lib/services/photo-groups-api-service'
import { PhotoGroup, PhotoGroupConflict } from '@/types/photo-groups'
// Mock the API service
jest.mock('@/lib/services/photo-groups-api-service', () => ({
  photoGroupsApiService: {
    getConflicts: jest.fn(),
    resolveConflict: jest.fn()
  }
}))
const mockApiService = photoGroupsApiService as jest.Mocked<typeof photoGroupsApiService>
describe('ConflictDetectionPanel', () => {
  const mockPhotoGroups: PhotoGroup[] = [
    {
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
    },
      id: 'group-2',
      name: 'Bridal Party',
      description: 'Wedding party group photos',
      photo_type: 'bridal_party',
      priority: 2,
      estimated_time_minutes: 45,
      photographer_notes: '',
    }
  ]
  const mockConflicts: PhotoGroupConflict[] = [
      groupId: 'group-1',
      conflictingGroupId: 'group-2',
      reason: 'time_overlap',
      severity: 'error',
      message: 'Time conflict between Family Photos and Bridal Party'
      reason: 'guest_overlap',
      severity: 'warning',
      message: '3 guests are assigned to both groups'
  const mockApiResponse = {
    conflicts: mockConflicts,
    summary: {
      total: 2,
      by_severity: { error: 1, warning: 1 },
      by_type: { time_overlap: 1, guest_overlap: 1 },
      auto_resolved: 0
    analyzed_groups: 2,
    detection_timestamp: '2024-01-01T12:00:00Z'
  const mockOnResolveConflict = jest.fn()
  const mockOnPreviewResolution = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiService.getConflicts.mockResolvedValue(mockApiResponse)
    mockApiService.resolveConflict.mockResolvedValue({
      message: 'Conflict resolved successfully',
      conflict_id: 'conflict-1',
      resolution_strategy: 'reschedule_second',
      resolution_result: {},
      resolved_at: '2024-01-01T12:30:00Z'
    })
  })
  describe('Basic Rendering', () => {
    it('renders conflict detection panel with header', async () => {
      render(
        <ConflictDetectionPanel
          photoGroups={mockPhotoGroups}
          coupleId="couple-1"
          onResolveConflict={mockOnResolveConflict}
          onPreviewResolution={mockOnPreviewResolution}
        />
      )
      expect(screen.getByText('Conflict Detection')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('2 conflicts detected')).toBeInTheDocument()
      })
    it('fetches conflicts from API on mount', async () => {
        expect(mockApiService.getConflicts).toHaveBeenCalledWith('couple-1', false, undefined)
    it('shows loading state while analyzing conflicts', () => {
      mockApiService.getConflicts.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      expect(screen.getByText('Analyzing conflicts...')).toBeInTheDocument()
  describe('Conflict Display', () => {
    it('displays conflicts with proper severity indicators', async () => {
        expect(screen.getByText('Time conflict between Family Photos and Bridal Party')).toBeInTheDocument()
        expect(screen.getByText('3 guests are assigned to both groups')).toBeInTheDocument()
    it('shows conflict details when expanded', async () => {
      const user = userEvent.setup()
        const expandButton = screen.getAllByRole('button').find(btn => 
          btn.getAttribute('aria-label')?.includes('expand') || 
          btn.querySelector('svg')?.getAttribute('data-testid')?.includes('eye')
        )
        
        if (expandButton) {
          user.click(expandButton)
        }
        expect(screen.getByText('Affected Groups')).toBeInTheDocument()
    it('displays resolution suggestions for each conflict', async () => {
        expect(screen.getByText('Suggested Resolutions')).toBeInTheDocument()
        expect(screen.getByText('Reschedule Second Group')).toBeInTheDocument()
        expect(screen.getByText('Split Conflicting Groups')).toBeInTheDocument()
  describe('Conflict Resolution', () => {
    it('resolves conflicts when Apply button is clicked', async () => {
        const applyButtons = screen.getAllByText('Apply')
        expect(applyButtons[0]).toBeInTheDocument()
      const applyButton = screen.getAllByText('Apply')[0]
      await user.click(applyButton)
      expect(mockApiService.resolveConflict).toHaveBeenCalledWith({
        conflict_id: expect.any(String),
        resolution_strategy: 'reschedule_second',
        resolution_data: expect.objectContaining({
          title: 'Reschedule Second Group',
          description: 'Move the later group to the next available time slot'
        })
    it('shows loading state while resolving conflict', async () => {
      mockApiService.resolveConflict.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
        const applyButton = screen.getAllByText('Apply')[0]
        user.click(applyButton)
        expect(screen.getByText('Applying...')).toBeInTheDocument()
    it('calls onResolveConflict callback when provided', async () => {
        expect(mockOnResolveConflict).toHaveBeenCalled()
    it('refreshes conflicts after successful resolution', async () => {
        // Should call getConflicts again after resolution
        expect(mockApiService.getConflicts).toHaveBeenCalledTimes(2)
  describe('Preview Mode', () => {
    it('toggles preview mode on and off', async () => {
      const previewButton = screen.getByText('Preview Mode')
      await user.click(previewButton)
      expect(screen.getByText('Hide Preview')).toBeInTheDocument()
        expect(screen.getAllByText('Preview')).toBeTruthy()
    it('calls onPreviewResolution when Preview button is clicked', async () => {
      // Enable preview mode first
      const previewModeButton = screen.getByText('Preview Mode')
      await user.click(previewModeButton)
        const previewButtons = screen.getAllByText('Preview')
        if (previewButtons.length > 0) {
          user.click(previewButtons[0])
        expect(mockOnPreviewResolution).toHaveBeenCalled()
  describe('Auto-Resolve Feature', () => {
    it('automatically resolves high-confidence conflicts when enabled', async () => {
      // Mock high-confidence resolutions
      const highConfidenceResponse = {
        ...mockApiResponse,
        conflicts: mockConflicts.map(conflict => ({
          ...conflict,
          resolutions: [{
            id: 'res-1',
            type: 'reassign_guest' as const,
            title: 'Reassign Conflicting Guests',
            description: 'Move overlapping guests to non-conflicting groups',
            confidence: 0.9,
            estimated_time_saved: 20,
            difficulty: 'easy' as const,
            auto_applicable: true
          }]
        }))
      }
      mockApiService.getConflicts.mockResolvedValue(highConfidenceResponse as any)
          autoResolve={true}
        expect(mockApiService.resolveConflict).toHaveBeenCalled()
    it('does not auto-resolve low-confidence conflicts', async () => {
      const lowConfidenceResponse = {
            type: 'manual_review' as const,
            title: 'Manual Review Required',
            description: 'Complex conflict requires manual intervention',
            confidence: 0.3,
            estimated_time_saved: 0,
            difficulty: 'hard' as const,
            auto_applicable: false
      mockApiService.getConflicts.mockResolvedValue(lowConfidenceResponse as any)
        // Should not auto-resolve
        expect(mockApiService.resolveConflict).not.toHaveBeenCalled()
  describe('Show/Hide Resolved Conflicts', () => {
    it('toggles between showing and hiding resolved conflicts', async () => {
      const showResolvedButton = screen.getByText('Show Resolved')
      await user.click(showResolvedButton)
      expect(screen.getByText('Hide Resolved')).toBeInTheDocument()
      // Should call API with includeResolved = true
        expect(mockApiService.getConflicts).toHaveBeenCalledWith('couple-1', true, undefined)
  describe('Refresh Functionality', () => {
    it('refreshes conflict analysis when refresh button is clicked', async () => {
        expect(mockApiService.getConflicts).toHaveBeenCalledTimes(1)
      const refreshButton = screen.getByText('Refresh')
      await user.click(refreshButton)
  describe('Empty States', () => {
    it('shows no conflicts message when no conflicts exist', async () => {
      mockApiService.getConflicts.mockResolvedValue({
        conflicts: [],
        summary: { total: 0, by_severity: {}, by_type: {} },
        analyzed_groups: 2,
        detection_timestamp: '2024-01-01T12:00:00Z'
        expect(screen.getByText('No conflicts detected')).toBeInTheDocument()
        expect(screen.getByText(/All photo groups are properly scheduled/)).toBeInTheDocument()
  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockApiService.getConflicts.mockRejectedValue(new Error('API Error'))
        expect(consoleSpy).toHaveBeenCalledWith('Failed to analyze conflicts:', expect.any(Error))
      consoleSpy.mockRestore()
    it('handles resolution errors gracefully', async () => {
      mockApiService.resolveConflict.mockRejectedValue(new Error('Resolution failed'))
        expect(consoleSpy).toHaveBeenCalledWith('Failed to resolve conflict:', expect.any(Error))
  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', async () => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
    it('supports keyboard navigation', async () => {
        const refreshButton = screen.getByText('Refresh')
        refreshButton.focus()
      await user.keyboard('{Enter}')
  describe('Performance', () => {
    it('does not re-analyze conflicts unnecessarily', async () => {
      const { rerender } = render(
      // Re-render with same props should not trigger new analysis
      rerender(
      // Should still be called only once
      expect(mockApiService.getConflicts).toHaveBeenCalledTimes(1)
})
