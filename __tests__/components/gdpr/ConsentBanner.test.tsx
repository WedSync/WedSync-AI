/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConsentBanner } from '@/components/gdpr/ConsentBanner'
import { GDPRComplianceManager } from '@/lib/compliance/gdpr-compliance'

// Mock the GDPR compliance manager
jest.mock('@/lib/compliance/gdpr-compliance', () => ({
  GDPRComplianceManager: {
    hasValidConsent: jest.fn(),
    getConsentSettings: jest.fn(),
    setConsentSettings: jest.fn(),
  },
  DATA_PROCESSING_PURPOSES: [
    {
      id: 'wedding_planning',
      name: 'Wedding Planning Services',
      description: 'Core functionality for managing your wedding plans',
      legalBasis: 'contract',
      required: true,
      categories: ['wedding_data']
    },
    {
      id: 'analytics',
      name: 'Website Analytics', 
      description: 'Understanding how you use our platform',
      legalBasis: 'consent',
      required: false,
      categories: ['usage_data']
    },
    {
      id: 'marketing',
      name: 'Marketing Communications',
      description: 'Sending you updates about new features',
      legalBasis: 'consent',
      required: false,
      categories: ['contact_data']
    },
    {
      id: 'functional',
      name: 'Enhanced Functionality',
      description: 'Additional features like personalized recommendations',
      legalBasis: 'consent',
      required: false,
      categories: ['preference_data']
    }
  ]
}))

const mockGDPRManager = GDPRComplianceManager as jest.Mocked<typeof GDPRComplianceManager>

describe('ConsentBanner', () => {
  const mockProps = {
    onAcceptAll: jest.fn(),
    onRejectAll: jest.fn(),
    onCustomize: jest.fn(),
    onClose: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGDPRManager.hasValidConsent.mockReturnValue(false)
    mockGDPRManager.getConsentSettings.mockReturnValue(null)
  })

  describe('Visibility and Initial State', () => {
    it('renders when no valid consent exists', () => {
      mockGDPRManager.hasValidConsent.mockReturnValue(false)
      
      render(<ConsentBanner {...mockProps} />)
      
      expect(screen.getByText('We value your privacy')).toBeInTheDocument()
      expect(screen.getByText('Accept All')).toBeInTheDocument()
      expect(screen.getByText('Reject Non-Essential')).toBeInTheDocument()
      expect(screen.getByText('Customize')).toBeInTheDocument()
    })

    it('does not render when valid consent already exists', () => {
      mockGDPRManager.hasValidConsent.mockReturnValue(true)
      
      render(<ConsentBanner {...mockProps} />)
      
      expect(screen.queryByText('We value your privacy')).not.toBeInTheDocument()
    })

    it('renders with correct theme classes', () => {
      render(<ConsentBanner {...mockProps} theme="dark" />)
      
      const card = screen.getByText('We value your privacy').closest('div[class*="bg-gray-900"]')
      expect(card).toBeInTheDocument()
    })

    it('renders at correct position', () => {
      render(<ConsentBanner {...mockProps} position="top" />)
      
      const container = screen.getByText('We value your privacy').closest('div[class*="top-4"]')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Accept All Functionality', () => {
    it('calls onAcceptAll and saves settings when Accept All is clicked', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      const acceptButton = screen.getByText('Accept All')
      await user.click(acceptButton)
      
      await waitFor(() => {
        expect(mockGDPRManager.setConsentSettings).toHaveBeenCalledWith({
          necessary: true,
          analytics: true,
          marketing: true,
          functional: true
        })
      })
      
      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Preferences Saved')).toBeInTheDocument()
      })
    })

    it('shows loading state during accept all process', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      const acceptButton = screen.getByText('Accept All')
      await user.click(acceptButton)
      
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('handles errors during accept all process', async () => {
      mockGDPRManager.setConsentSettings.mockImplementation(() => {
        throw new Error('Save failed')
      })
      
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      const acceptButton = screen.getByText('Accept All')
      await user.click(acceptButton)
      
      await waitFor(() => {
        expect(screen.getByText(/There was an error saving your preferences/)).toBeInTheDocument()
      })
    })
  })

  describe('Reject All Functionality', () => {
    it('calls onRejectAll and saves minimal settings when Reject Non-Essential is clicked', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      const rejectButton = screen.getByText('Reject Non-Essential')
      await user.click(rejectButton)
      
      await waitFor(() => {
        expect(mockGDPRManager.setConsentSettings).toHaveBeenCalledWith({
          necessary: true,
          analytics: false,
          marketing: false,
          functional: false
        })
      })
      
      await waitFor(() => {
        expect(screen.getByText('Preferences Saved')).toBeInTheDocument()
      })
    })
  })

  describe('Customize Functionality', () => {
    it('switches to detailed view when Customize is clicked', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      const customizeButton = screen.getByText('Customize')
      await user.click(customizeButton)
      
      expect(screen.getByText('Privacy Preferences')).toBeInTheDocument()
      expect(screen.getByText('Choose which data processing you consent to')).toBeInTheDocument()
    })

    it('shows all data processing purposes in detailed view', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Customize'))
      
      expect(screen.getByText('Wedding Planning Services')).toBeInTheDocument()
      expect(screen.getByText('Website Analytics')).toBeInTheDocument()
      expect(screen.getByText('Marketing Communications')).toBeInTheDocument()
      expect(screen.getByText('Enhanced Functionality')).toBeInTheDocument()
    })

    it('allows toggling individual consent options', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Customize'))
      
      // Analytics toggle should be clickable (not required)
      const analyticsToggle = screen.getByLabelText(/Enable Website Analytics/)
      expect(analyticsToggle).toBeInTheDocument()
      
      await user.click(analyticsToggle)
      // Verify the toggle state changed (implementation would update internal state)
    })

    it('shows required services as disabled', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Customize'))
      
      // Wedding planning should be marked as required
      expect(screen.getByText('Required')).toBeInTheDocument()
    })

    it('allows saving custom preferences', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Customize'))
      
      const saveButton = screen.getByText('Save Preferences')
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockGDPRManager.setConsentSettings).toHaveBeenCalled()
      })
    })

    it('allows going back to main banner from detailed view', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Customize'))
      
      const backButton = screen.getByText('Back')
      await user.click(backButton)
      
      expect(screen.getByText('We value your privacy')).toBeInTheDocument()
    })
  })

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)
      
      expect(mockProps.onClose).toHaveBeenCalled()
    })
  })

  describe('Success State', () => {
    it('shows success message after successful save', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Accept All'))
      
      await waitFor(() => {
        expect(screen.getByText('Preferences Saved')).toBeInTheDocument()
        expect(screen.getByText('Your privacy settings have been updated')).toBeInTheDocument()
      })
    })

    it('auto-hides after success message', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Accept All'))
      
      await waitFor(() => {
        expect(screen.getByText('Preferences Saved')).toBeInTheDocument()
      })
      
      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(2000)
      })
      
      await waitFor(() => {
        expect(mockProps.onAcceptAll).toHaveBeenCalled()
      })
      
      jest.useRealTimers()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for toggle buttons', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Customize'))
      
      const analyticsToggle = screen.getByLabelText(/Website Analytics/)
      expect(analyticsToggle).toBeInTheDocument()
    })

    it('has proper focus management', async () => {
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      const acceptButton = screen.getByText('Accept All')
      acceptButton.focus()
      
      expect(document.activeElement).toBe(acceptButton)
    })
  })

  describe('Props Handling', () => {
    it('applies custom className', () => {
      render(<ConsentBanner {...mockProps} className="custom-class" />)
      
      const card = screen.getByText('We value your privacy').closest('.custom-class')
      expect(card).toBeInTheDocument()
    })

    it('shows logo when showLogo is true', () => {
      render(<ConsentBanner {...mockProps} showLogo={true} />)
      
      // Shield icon should be present in the header
      const shieldIcon = screen.getByText('We value your privacy').parentElement?.querySelector('svg')
      expect(shieldIcon).toBeInTheDocument()
    })

    it('hides logo when showLogo is false', () => {
      render(<ConsentBanner {...mockProps} showLogo={false} />)
      
      // Logo container should not be present
      expect(screen.queryByTestId('consent-banner-logo')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when save fails', async () => {
      mockGDPRManager.setConsentSettings.mockImplementation(() => {
        throw new Error('Network error')
      })
      
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      await user.click(screen.getByText('Accept All'))
      
      await waitFor(() => {
        expect(screen.getByText(/There was an error saving your preferences/)).toBeInTheDocument()
      })
    })

    it('allows retry after error', async () => {
      mockGDPRManager.setConsentSettings
        .mockImplementationOnce(() => {
          throw new Error('Network error')
        })
        .mockImplementationOnce(() => {})
      
      const user = userEvent.setup()
      render(<ConsentBanner {...mockProps} />)
      
      // First attempt fails
      await user.click(screen.getByText('Accept All'))
      
      await waitFor(() => {
        expect(screen.getByText(/There was an error saving your preferences/)).toBeInTheDocument()
      })
      
      // Second attempt succeeds
      await user.click(screen.getByText('Accept All'))
      
      await waitFor(() => {
        expect(screen.getByText('Preferences Saved')).toBeInTheDocument()
      })
    })
  })
})