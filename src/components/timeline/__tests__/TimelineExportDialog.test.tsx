// =====================================================
// TIMELINE EXPORT DIALOG TESTS
// Comprehensive test coverage for export dialog functionality
// Feature ID: WS-160 - Timeline Builder UI
// Created: 2025-01-20

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { TimelineExportDialog } from '../TimelineExportDialog'
import type { WeddingTimeline, TimelineEvent } from '@/types/timeline'
import { TimelineExportService } from '@/lib/services/timelineExportService'
// TEST SETUP & MOCKS
// Mock the export service
jest.mock('@/lib/services/timelineExportService')
const MockTimelineExportService = TimelineExportService as jest.MockedClass<typeof TimelineExportService>
// Mock motion to avoid animation issues in tests
jest.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}))
// Mock download functionality
const mockDownloadBlob = jest.fn()
jest.mock('@/lib/services/timelineExportService', () => ({
  TimelineExportService: jest.fn(),
  downloadBlob: mockDownloadBlob,
  getExportFormatLabel: (format: string) => `${format.toUpperCase()} Document`,
  getExportFormatDescription: (format: string) => `Export as ${format}`,
  validateExportOptions: jest.fn().mockReturnValue({ valid: true, errors: [] })
// TEST DATA
const mockTimeline: WeddingTimeline = {
  id: 'timeline-1',
  organization_id: 'org-1',
  client_id: 'client-1',
  name: 'Sarah & John Wedding',
  wedding_date: '2025-06-15',
  timezone: 'America/New_York',
  start_time: '09:00',
  end_time: '23:00',
  buffer_time_minutes: 15,
  allow_vendor_edits: true,
  require_approval: false,
  version: 1,
  is_published: false,
  status: 'draft',
  created_at: '2025-01-20T10:00:00Z',
  updated_at: '2025-01-20T10:00:00Z'
}
const mockEvents: TimelineEvent[] = [
  {
    id: 'event-1',
    timeline_id: 'timeline-1',
    title: 'Wedding Ceremony',
    description: 'Beautiful outdoor ceremony',
    event_type: 'ceremony',
    category: 'ceremony',
    start_time: '2025-06-15T14:00:00Z',
    end_time: '2025-06-15T15:00:00Z',
    duration_minutes: 60,
    location: 'Garden Pavilion',
    priority: 'critical',
    status: 'confirmed',
    is_locked: false,
    is_flexible: false,
    weather_dependent: true,
    created_at: '2025-01-20T10:00:00Z',
    updated_at: '2025-01-20T10:00:00Z'
    id: 'event-2',
    title: 'Reception Dinner',
    description: 'Elegant dinner reception',
    event_type: 'reception',
    category: 'reception',
    start_time: '2025-06-15T18:00:00Z',
    end_time: '2025-06-15T22:00:00Z',
    duration_minutes: 240,
    location: 'Ballroom',
    priority: 'high',
    is_flexible: true,
    weather_dependent: false,
  }
]
// MAIN TEST SUITE
describe('TimelineExportDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    timeline: mockTimeline,
    events: mockEvents
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful export by default
    const mockExportInstance = {
      exportTimeline: jest.fn().mockResolvedValue({
        success: true,
        blob: new Blob(['test content'], { type: 'application/pdf' }),
        filename: 'test-timeline.pdf',
        size: 1024
      })
    }
    MockTimelineExportService.mockImplementation(() => mockExportInstance as any)
  })
  // =====================================================
  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render when open', () => {
      render(<TimelineExportDialog {...defaultProps} />)
      
      expect(screen.getByText('Export Timeline')).toBeInTheDocument()
      expect(screen.getByText(/Sarah & John Wedding/)).toBeInTheDocument()
      expect(screen.getByText(/Jun 15, 2025/)).toBeInTheDocument()
    })
    it('should not render when closed', () => {
      render(<TimelineExportDialog {...defaultProps} isOpen={false} />)
      expect(screen.queryByText('Export Timeline')).not.toBeInTheDocument()
    it('should display all export format options', () => {
      expect(screen.getByText('PDF Document')).toBeInTheDocument()
      expect(screen.getByText('Excel Workbook')).toBeInTheDocument()
      expect(screen.getByText('CSV File')).toBeInTheDocument()
      expect(screen.getByText('iCal Calendar')).toBeInTheDocument()
      expect(screen.getByText('Google Calendar')).toBeInTheDocument()
    it('should show recommended badge for PDF format', () => {
      expect(screen.getByText('Recommended')).toBeInTheDocument()
    it('should display event count', () => {
      expect(screen.getByText('2 events will be exported')).toBeInTheDocument()
  // FORMAT SELECTION TESTS
  describe('Format Selection', () => {
    it('should select PDF format by default', () => {
      const pdfCard = screen.getByText('PDF Document').closest('button')
      expect(pdfCard).toHaveClass('border-blue-500')
    it('should change format when different option is selected', async () => {
      const user = userEvent.setup()
      const csvCard = screen.getByText('CSV File').closest('button')
      await user.click(csvCard!)
      expect(csvCard).toHaveClass('border-blue-500')
    it('should show format-specific options for PDF', async () => {
      // PDF should be selected by default, check for PDF options
      expect(screen.getByText('Page Orientation')).toBeInTheDocument()
      expect(screen.getByText('Font Size')).toBeInTheDocument()
    it('should hide PDF options when other format is selected', async () => {
      expect(screen.queryByText('Page Orientation')).not.toBeInTheDocument()
      expect(screen.queryByText('Font Size')).not.toBeInTheDocument()
  // EXPORT OPTIONS TESTS
  describe('Export Options', () => {
    it('should toggle vendor details option', async () => {
      const vendorCheckbox = screen.getByLabelText('Include vendor details')
      expect(vendorCheckbox).toBeChecked()
      await user.click(vendorCheckbox)
      expect(vendorCheckbox).not.toBeChecked()
    it('should toggle internal notes option', async () => {
      const notesCheckbox = screen.getByLabelText('Include internal notes')
      expect(notesCheckbox).not.toBeChecked()
      await user.click(notesCheckbox)
      expect(notesCheckbox).toBeChecked()
    it('should allow custom footer input', async () => {
      const footerInput = screen.getByPlaceholderText('e.g., Created by Your Wedding Planner')
      await user.type(footerInput, 'Custom Footer Text')
      expect(footerInput).toHaveValue('Custom Footer Text')
    it('should change page orientation for PDF', async () => {
      const orientationSelect = screen.getByDisplayValue('Portrait')
      await user.selectOptions(orientationSelect, 'landscape')
      expect(orientationSelect).toHaveValue('landscape')
    it('should change font size for PDF', async () => {
      const fontSizeSelect = screen.getByDisplayValue('Medium')
      await user.selectOptions(fontSizeSelect, 'large')
      expect(fontSizeSelect).toHaveValue('large')
  // EXPORT PROCESS TESTS
  describe('Export Process', () => {
    it('should start export when export button is clicked', async () => {
      const exportButton = screen.getByText(/Export PDF Document/)
      await user.click(exportButton)
      expect(MockTimelineExportService).toHaveBeenCalledWith(expect.any(Function))
    it('should show loading state during export', async () => {
      // Mock slow export
      const mockExportInstance = {
        exportTimeline: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            success: true,
            blob: new Blob(['test'], { type: 'application/pdf' }),
            filename: 'test.pdf'
          }), 100))
        )
      }
      MockTimelineExportService.mockImplementation(() => mockExportInstance as any)
      expect(screen.getByText('Exporting Timeline')).toBeInTheDocument()
    it('should show progress updates during export', async () => {
        exportTimeline: jest.fn().mockImplementation((timeline, events, options) => {
          // Simulate progress callback
          const progressCallback = MockTimelineExportService.mock.calls[0][0]
          if (progressCallback) {
            setTimeout(() => progressCallback({
              stage: 'processing',
              progress: 50,
              message: 'Processing events...'
            }), 10)
          }
          return Promise.resolve({
          })
        })
      await waitFor(() => {
        expect(screen.getByText('Processing events...')).toBeInTheDocument()
    it('should show success message on successful export', async () => {
        expect(screen.getByText('Export Complete!')).toBeInTheDocument()
        expect(screen.getByText(/test-timeline.pdf/)).toBeInTheDocument()
    it('should trigger download on successful export', async () => {
        expect(mockDownloadBlob).toHaveBeenCalledWith(
          expect.any(Blob),
          'test-timeline.pdf'
    it('should show error message on failed export', async () => {
        exportTimeline: jest.fn().mockResolvedValue({
          success: false,
          filename: 'error.txt',
          error: 'Export failed due to network error'
        expect(screen.getByText('Export Failed')).toBeInTheDocument()
        expect(screen.getByText('Error: Export failed due to network error')).toBeInTheDocument()
    it('should handle export exceptions gracefully', async () => {
        exportTimeline: jest.fn().mockRejectedValue(new Error('Network error'))
  // VALIDATION TESTS
  describe('Validation', () => {
    it('should show validation errors when options are invalid', async () => {
      const validateExportOptions = require('@/lib/services/timelineExportService').validateExportOptions
      validateExportOptions.mockReturnValue({
        valid: false,
        errors: ['Invalid export format', 'Missing required field']
      expect(screen.getByText('Export Configuration Errors')).toBeInTheDocument()
      expect(screen.getByText('Invalid export format')).toBeInTheDocument()
      expect(screen.getByText('Missing required field')).toBeInTheDocument()
    it('should disable export button when validation fails', async () => {
        errors: ['Invalid format']
      expect(exportButton).toBeDisabled()
  // DIALOG INTERACTION TESTS
  describe('Dialog Interactions', () => {
    it('should close dialog when close button is clicked', async () => {
      const mockOnClose = jest.fn()
      render(<TimelineExportDialog {...defaultProps} onClose={mockOnClose} />)
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)
      expect(mockOnClose).toHaveBeenCalled()
    it('should close dialog when cancel button is clicked', async () => {
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)
    it('should close dialog automatically after successful export', async () => {
      jest.useFakeTimers()
      // Wait for success state
      // Fast forward timers to trigger auto-close
      act(() => {
        jest.advanceTimersByTime(2000)
      jest.useRealTimers()
    it('should prevent dialog close when clicking inside', async () => {
      const dialogContent = screen.getByText('Export Timeline')
      await user.click(dialogContent)
      expect(mockOnClose).not.toHaveBeenCalled()
  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    it('should support keyboard navigation', async () => {
      // Tab through format options
      await user.tab()
      const firstFormatCard = screen.getByText('PDF Document').closest('button')
      expect(firstFormatCard).toHaveFocus()
      // Enter should select the format
      await user.keyboard('{Enter}')
      expect(firstFormatCard).toHaveClass('border-blue-500')
  // EDGE CASES
  describe('Edge Cases', () => {
    it('should handle empty events array', () => {
      render(<TimelineExportDialog {...defaultProps} events={[]} />)
      expect(screen.getByText('0 events will be exported')).toBeInTheDocument()
    it('should handle missing timeline data gracefully', () => {
      const invalidTimeline = { ...mockTimeline, name: '', wedding_date: '' }
      expect(() => {
        render(<TimelineExportDialog {...defaultProps} timeline={invalidTimeline} />)
      }).not.toThrow()
    it('should show file size when available', async () => {
          success: true,
          blob: new Blob(['test'], { type: 'application/pdf' }),
          filename: 'test.pdf',
          size: 2048
        expect(screen.getByText('File size: 2 KB')).toBeInTheDocument()
    it('should handle multiple rapid export attempts', async () => {
      // Click multiple times rapidly
      // Should only start one export
      expect(MockTimelineExportService).toHaveBeenCalledTimes(1)
})
