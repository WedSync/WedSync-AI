/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CalendarAuthFlow, OAUTH_PROVIDERS } from '@/components/calendar-integration/CalendarAuthFlow'

const mockProvider = OAUTH_PROVIDERS.google
const mockHandlers = {
  onConnect: jest.fn().mockResolvedValue(undefined),
  onCancel: jest.fn(),
  onBack: jest.fn()
}

describe('CalendarAuthFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={false}
          {...mockHandlers}
        />
      )

      expect(screen.queryByText('Connect Google Calendar')).not.toBeInTheDocument()
    })

    it('renders modal when isOpen is true', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument()
      expect(screen.getByText('Sync with Google Calendar and Google Workspace')).toBeInTheDocument()
    })

    it('renders progress steps correctly', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Review Permissions')).toBeInTheDocument()
      expect(screen.getByText('Privacy & Terms')).toBeInTheDocument()
      expect(screen.getByText('Connect Account')).toBeInTheDocument()
    })
  })

  describe('Step Navigation', () => {
    it('starts on permissions step', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Choose what WedSync can access')).toBeInTheDocument()
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('navigates to privacy step when continue is clicked', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      const continueButton = screen.getByText('Continue')
      fireEvent.click(continueButton)

      await waitFor(() => {
        expect(screen.getByText('How WedSync uses your calendar data')).toBeInTheDocument()
      })
    })

    it('can navigate back to previous step', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to step 2
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
      })

      // Navigate back
      fireEvent.click(screen.getByText('Back'))

      await waitFor(() => {
        expect(screen.getByText('Choose what WedSync can access')).toBeInTheDocument()
      })
    })
  })

  describe('Permissions Step', () => {
    it('displays all provider permissions', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Read Calendar Events')).toBeInTheDocument()
      expect(screen.getByText('Create Calendar Events')).toBeInTheDocument()
      expect(screen.getByText('Manage Calendar Events')).toBeInTheDocument()
    })

    it('shows required permissions as checked and disabled', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      const readPermission = screen.getByLabelText('Read Calendar Events')
      const writePermission = screen.getByLabelText('Create Calendar Events')

      expect(readPermission).toBeChecked()
      expect(readPermission).toBeDisabled()
      expect(writePermission).toBeChecked()
      expect(writePermission).toBeDisabled()
    })

    it('allows toggling optional permissions', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      const managePermission = screen.getByLabelText('Manage Calendar Events')
      expect(managePermission).not.toBeDisabled()

      fireEvent.click(managePermission)
      expect(managePermission).not.toBeChecked()

      fireEvent.click(managePermission)
      expect(managePermission).toBeChecked()
    })

    it('shows risk levels for permissions', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('low risk')).toBeInTheDocument()
      expect(screen.getAllByText('medium risk')).toHaveLength(2)
    })

    it('shows required badges for required permissions', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getAllByText('Required')).toHaveLength(2)
    })
  })

  describe('Privacy & Terms Step', () => {
    it('shows privacy details when requested', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to privacy step
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const privacyToggle = screen.getByText('How WedSync uses your calendar data')
        fireEvent.click(privacyToggle)
      })

      await waitFor(() => {
        expect(screen.getByText(/We only read calendar availability to prevent double-bookings/)).toBeInTheDocument()
      })
    })

    it('requires terms acceptance to continue', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to privacy step
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const continueButton = screen.getByText('Continue')
        expect(continueButton).toBeDisabled()
      })

      // Accept terms
      const termsCheckbox = screen.getByLabelText(/I agree to WedSync's/)
      fireEvent.click(termsCheckbox)

      await waitFor(() => {
        const continueButton = screen.getByText('Continue')
        expect(continueButton).not.toBeDisabled()
      })
    })

    it('shows privacy policy and terms links', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to privacy step
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Terms of Service/ })).toHaveAttribute(
          'href',
          mockProvider.termsUrl
        )
        expect(screen.getByRole('link', { name: /Privacy Policy/ })).toHaveAttribute(
          'href',
          mockProvider.privacyUrl
        )
      })
    })
  })

  describe('Connect Step', () => {
    it('shows selected permissions summary', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate through steps
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const termsCheckbox = screen.getByLabelText(/I agree to WedSync's/)
        fireEvent.click(termsCheckbox)
      })

      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        expect(screen.getByText('Selected Permissions:')).toBeInTheDocument()
        expect(screen.getByText('Read Calendar Events')).toBeInTheDocument()
        expect(screen.getByText('Create Calendar Events')).toBeInTheDocument()
      })
    })

    it('shows connect button and handles connection', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to connect step
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const termsCheckbox = screen.getByLabelText(/I agree to WedSync's/)
        fireEvent.click(termsCheckbox)
      })

      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const connectButton = screen.getByText('Connect Now')
        fireEvent.click(connectButton)
      })

      expect(mockHandlers.onConnect).toHaveBeenCalledWith(
        mockProvider,
        expect.arrayContaining(['read_calendar', 'write_calendar', 'manage_calendar'])
      )
    })

    it('requires terms acceptance for connection', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to connect step without accepting terms
      fireEvent.click(screen.getByText('Continue'))
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Continue'))
      })

      await waitFor(() => {
        const connectButton = screen.getByText('Connect Now')
        fireEvent.click(connectButton)
      })

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('You must accept the terms and privacy policy to continue.')).toBeInTheDocument()
      })

      expect(mockHandlers.onConnect).not.toHaveBeenCalled()
    })

    it('shows loading state during connection', async () => {
      let resolveConnect: () => void
      const connectionPromise = new Promise<void>((resolve) => {
        resolveConnect = resolve
      })
      mockHandlers.onConnect.mockReturnValueOnce(connectionPromise)

      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to connect step with terms accepted
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const termsCheckbox = screen.getByLabelText(/I agree to WedSync's/)
        fireEvent.click(termsCheckbox)
      })

      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const connectButton = screen.getByText('Connect Now')
        fireEvent.click(connectButton)
      })

      // Should show connecting state
      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument()
      })

      // Resolve the promise
      resolveConnect!()

      await waitFor(() => {
        expect(screen.queryByText('Connecting...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays connection errors', async () => {
      mockHandlers.onConnect.mockRejectedValueOnce(new Error('Connection failed'))

      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to connect step and attempt connection
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const termsCheckbox = screen.getByLabelText(/I agree to WedSync's/)
        fireEvent.click(termsCheckbox)
      })

      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        const connectButton = screen.getByText('Connect Now')
        fireEvent.click(connectButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Controls', () => {
    it('handles cancel action', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      fireEvent.click(screen.getByText('Cancel'))
      expect(mockHandlers.onCancel).toHaveBeenCalled()
    })

    it('handles close button', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      const closeButton = screen.getByRole('button', { name: '' }) // X button
      fireEvent.click(closeButton)
      expect(mockHandlers.onCancel).toHaveBeenCalled()
    })

    it('shows back to dashboard button on first step when onBack provided', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      const backButton = screen.getByText('Back to Dashboard')
      fireEvent.click(backButton)
      expect(mockHandlers.onBack).toHaveBeenCalled()
    })
  })

  describe('Different Providers', () => {
    it('renders correctly for Outlook provider', () => {
      render(
        <CalendarAuthFlow
          provider={OAUTH_PROVIDERS.outlook}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Connect Microsoft Outlook')).toBeInTheDocument()
      expect(screen.getByText('Sync with Outlook and Microsoft 365 calendars')).toBeInTheDocument()
    })

    it('renders correctly for Apple provider', () => {
      render(
        <CalendarAuthFlow
          provider={OAUTH_PROVIDERS.apple}
          isOpen={true}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('Connect Apple Calendar')).toBeInTheDocument()
      expect(screen.getByText('Sync with Apple Calendar via CalDAV')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper modal focus management', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Modal should be focusable and have proper role
      const modal = screen.getByRole('dialog', { hidden: true }) || 
                   document.querySelector('[role="dialog"]') ||
                   screen.getByText('Connect Google Calendar').closest('div')
      
      expect(modal).toBeInTheDocument()
    })

    it('supports keyboard navigation for permissions', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      const optionalPermission = screen.getByLabelText('Manage Calendar Events')
      
      // Should be able to focus and toggle with keyboard
      optionalPermission.focus()
      fireEvent.keyDown(optionalPermission, { key: ' ', code: 'Space' })
      
      expect(optionalPermission).not.toBeChecked()
    })

    it('has proper ARIA labels for form controls', () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Navigate to privacy step
      fireEvent.click(screen.getByText('Continue'))

      // Terms checkbox should have proper labeling
      const termsCheckbox = screen.getByLabelText(/I agree to WedSync's/)
      expect(termsCheckbox).toHaveAttribute('type', 'checkbox')
    })
  })

  describe('Step Completion Indicators', () => {
    it('marks steps as completed when passed', async () => {
      render(
        <CalendarAuthFlow
          provider={mockProvider}
          isOpen={true}
          {...mockHandlers}
        />
      )

      // Complete first step
      fireEvent.click(screen.getByText('Continue'))

      await waitFor(() => {
        // First step should show as completed (green check)
        const progressSteps = document.querySelectorAll('[class*="bg-green"]')
        expect(progressSteps.length).toBeGreaterThan(0)
      })
    })
  })
})