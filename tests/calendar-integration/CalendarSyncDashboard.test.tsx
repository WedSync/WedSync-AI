/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CalendarSyncDashboard } from '@/components/calendar-integration/CalendarSyncDashboard'
import type { CalendarProvider } from '@/components/calendar-integration/CalendarSyncDashboard'

// Mock data
const mockProviders: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    isConnected: true,
    lastSync: new Date('2025-01-14T10:30:00Z'),
    syncStatus: 'active',
    permissions: ['read', 'write'],
    accountEmail: 'test@gmail.com',
    calendarCount: 3,
    nextSyncTime: new Date('2025-01-14T11:00:00Z')
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    isConnected: false,
    lastSync: null,
    syncStatus: 'pending',
    permissions: [],
    calendarCount: 0
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    isConnected: true,
    lastSync: new Date('2025-01-14T09:00:00Z'),
    syncStatus: 'error',
    permissions: ['read'],
    accountEmail: 'test@icloud.com',
    calendarCount: 2,
    errorMessage: 'Authentication expired. Please reconnect.'
  }
]

const mockHandlers = {
  onConnect: jest.fn().mockResolvedValue(undefined),
  onDisconnect: jest.fn().mockResolvedValue(undefined),
  onSync: jest.fn().mockResolvedValue(undefined),
  onManageSettings: jest.fn().mockResolvedValue(undefined)
}

describe('CalendarSyncDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders header with correct title and description', () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Calendar Integration')).toBeInTheDocument()
      expect(screen.getByText(/Sync your wedding timelines with your calendar providers/)).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      // Should show loading skeleton
      expect(screen.getByRole('generic', { hidden: true })).toHaveClass('animate-pulse')
    })

    it('renders sync statistics after loading', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('145')).toBeInTheDocument() // Total events
        expect(screen.getByText('23')).toBeInTheDocument() // Synced today
        expect(screen.getByText('2')).toBeInTheDocument() // Failed syncs
        expect(screen.getByText('85%')).toBeInTheDocument() // Health score
      }, { timeout: 2000 })
    })

    it('renders provider cards with correct information', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        // Google Calendar - connected
        expect(screen.getByText('Google Calendar')).toBeInTheDocument()
        expect(screen.getByText('test@gmail.com')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument() // Calendar count

        // Outlook - not connected
        expect(screen.getByText('Microsoft Outlook')).toBeInTheDocument()
        expect(screen.getByText('Connect')).toBeInTheDocument()

        // Apple Calendar - error state
        expect(screen.getByText('Apple Calendar')).toBeInTheDocument()
        expect(screen.getByText('Authentication expired. Please reconnect.')).toBeInTheDocument()
      })
    })
  })

  describe('Provider Status Icons', () => {
    it('shows correct status icons for different provider states', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        // Google - active (green check)
        const googleCard = screen.getByText('Google Calendar').closest('[class*="bg-elevated"]')
        expect(googleCard).toContainHTML('text-green-500')

        // Outlook - pending (amber alert)
        const outlookCard = screen.getByText('Microsoft Outlook').closest('[class*="bg-elevated"]')
        expect(outlookCard).toContainHTML('text-amber-500')

        // Apple - error (red X)
        const appleCard = screen.getByText('Apple Calendar').closest('[class*="bg-elevated"]')
        expect(appleCard).toContainHTML('text-red-500')
      })
    })
  })

  describe('User Interactions', () => {
    it('handles connect action for disconnected provider', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        const connectButton = screen.getByText('Connect')
        fireEvent.click(connectButton)
      })

      expect(mockHandlers.onConnect).toHaveBeenCalledWith('outlook')
    })

    it('handles sync action for connected provider', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        // Find sync button for Google Calendar (should be a refresh icon button)
        const googleCard = screen.getByText('Google Calendar').closest('[class*="bg-elevated"]')
        const syncButton = googleCard?.querySelector('button[aria-label*="sync"]') || 
                          googleCard?.querySelector('svg[class*="RefreshCw"]')?.closest('button')
        
        if (syncButton) {
          fireEvent.click(syncButton)
        }
      })

      expect(mockHandlers.onSync).toHaveBeenCalledWith('google')
    })

    it('handles sync all action', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        const syncAllButton = screen.getByText('Sync All')
        fireEvent.click(syncAllButton)
      })

      expect(mockHandlers.onSync).toHaveBeenCalledWith()
    })

    it('handles manage settings action', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        // Find settings button for Google Calendar
        const googleCard = screen.getByText('Google Calendar').closest('[class*="bg-elevated"]')
        const settingsButton = googleCard?.querySelector('svg[class*="Settings"]')?.closest('button')
        
        if (settingsButton) {
          fireEvent.click(settingsButton)
        }
      })

      expect(mockHandlers.onManageSettings).toHaveBeenCalledWith('google')
    })

    it('handles disconnect action', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        // Find disconnect button for Google Calendar (X circle icon)
        const googleCard = screen.getByText('Google Calendar').closest('[class*="bg-elevated"]')
        const disconnectButton = googleCard?.querySelector('svg[class*="XCircle"]')?.closest('button')
        
        if (disconnectButton) {
          fireEvent.click(disconnectButton)
        }
      })

      expect(mockHandlers.onDisconnect).toHaveBeenCalledWith('google')
    })
  })

  describe('Loading States', () => {
    it('shows syncing state when sync in progress', async () => {
      const { rerender } = render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Google Calendar')).toBeInTheDocument()
      })

      // Click sync all to trigger loading state
      const syncAllButton = screen.getByText('Sync All')
      fireEvent.click(syncAllButton)

      // Should show spinning icon
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sync All/i })).toContainHTML('animate-spin')
      })
    })

    it('disables buttons during sync operations', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        const syncAllButton = screen.getByText('Sync All')
        fireEvent.click(syncAllButton)
      })

      // Button should be disabled
      await waitFor(() => {
        const syncAllButton = screen.getByText('Sync All')
        expect(syncAllButton).toBeDisabled()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error messages for providers in error state', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Authentication expired. Please reconnect.')).toBeInTheDocument()
      })
    })

    it('handles connection failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockHandlers.onConnect.mockRejectedValueOnce(new Error('Connection failed'))

      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        const connectButton = screen.getByText('Connect')
        fireEvent.click(connectButton)
      })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Connection failed:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Responsive Design', () => {
    it('renders properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      // Should render without layout issues
      expect(screen.getByText('Calendar Integration')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        // Buttons should have proper labels
        expect(screen.getByRole('button', { name: /Sync All/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        const syncAllButton = screen.getByText('Sync All')
        
        // Focus and activate with keyboard
        syncAllButton.focus()
        fireEvent.keyDown(syncAllButton, { key: 'Enter', code: 'Enter' })
      })

      expect(mockHandlers.onSync).toHaveBeenCalled()
    })
  })

  describe('Time Formatting', () => {
    it('formats time ago correctly', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        // Should show relative time for recent syncs
        expect(screen.getByText(/Last sync:/)).toBeInTheDocument()
      })
    })
  })

  describe('Quick Actions', () => {
    it('renders quick action buttons', async () => {
      render(
        <CalendarSyncDashboard
          weddingId="test-wedding-id"
          {...mockHandlers}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Sync Wedding Timeline')).toBeInTheDocument()
        expect(screen.getByText('Privacy Settings')).toBeInTheDocument()
        expect(screen.getByText('View Help Docs')).toBeInTheDocument()
      })
    })
  })
})